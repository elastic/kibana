/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { AnalyticsServiceSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type {
  AttackDiscoveryExecutorOptions,
  AttackDiscoveryScheduleContext,
} from '@kbn/attack-discovery-schedules-common';
import {
  backfillAttackIdsBestEffort,
  buildAlertIdToAttackIdsMap,
  generateAttackDiscoveryAlertHash,
  normalizeAttackDiscovery,
  transformToBaseAlertDocument,
} from '@kbn/attack-discovery-schedules-common';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAttackDiscoveryMarkdownFields } from '@kbn/elastic-assistant-common';
import { ALERT_URL } from '@kbn/rule-data-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { v4 as uuidv4 } from 'uuid';

import type {
  GetEventLogIndex,
  GetEventLogger,
  WorkflowConfig,
} from '@kbn/discoveries/impl/attack_discovery/generation/types';
import type { SourceMetadata } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';
import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import {
  executeGenerationWorkflow,
  getInferredPrebuiltStepTypes,
} from '../../../routes/generate/helpers';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { checkManagedWorkflowIntegrity } from '../../../managed_workflows/check_managed_workflow_integrity';
import { wrapManagementApiForScheduledExecution } from './helpers/wrap_management_api_for_scheduled_execution';

const DEFAULT_INSIGHT_TYPE = 'attack_discovery';

const computeSha256Hash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const getDefaultWorkflowConfig = (): WorkflowConfig => ({
  alert_retrieval_mode: 'custom_query',
  alert_retrieval_workflow_ids: [],
  alert_retrieval_workflows_enabled: false,
  default_retrieval_enabled: true,
  skill_enabled: true,
  validation_workflow_id: 'default',
});

export interface WorkflowExecutorDeps {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: GetEventLogIndex;
  getEventLogger: GetEventLogger;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  publicBaseUrl?: string;
  request: KibanaRequest;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}

export const workflowExecutor = async ({
  deps,
  options,
}: {
  deps: WorkflowExecutorDeps;
  options: AttackDiscoveryExecutorOptions;
}): Promise<{ state: Record<string, never> }> => {
  const { params, rule, services, spaceId } = options;
  const { alertsClient, scopedClusterClient } = services;

  if (alertsClient == null) {
    throw new AlertsClientError();
  }

  const { alertsIndexPattern, apiConfig, combinedFilter, end, size, start } = params;

  const paramsWorkflowConfig = (params as Record<string, unknown>).workflowConfig as
    | {
        alertRetrievalMode?: 'custom_only' | 'custom_query' | 'esql';
        alertRetrievalWorkflowIds?: string[];
        alertRetrievalWorkflowsEnabled?: boolean;
        defaultAlertRetrievalEnabled?: boolean;
        defaultRetrievalEnabled?: boolean;
        esqlQuery?: string;
        skillEnabled?: boolean;
        validationWorkflowId?: string;
      }
    | undefined;

  // New composite-persisted schedules carry the three independent toggles directly.
  // Legacy-persisted schedules only have the single-enum shape; derive the composite
  // toggles from the legacy fields for backward compatibility. Legacy `custom_only`
  // meant "default retrieval off, custom workflows only", so it maps to
  // `default_retrieval_enabled: false` with the query mode falling back to
  // `custom_query`. The skill toggle is on by default.
  const isComposite = typeof paramsWorkflowConfig?.skillEnabled === 'boolean';
  const legacyRetrievalMode =
    paramsWorkflowConfig?.alertRetrievalMode ??
    (paramsWorkflowConfig?.defaultAlertRetrievalEnabled === false ? 'custom_only' : 'custom_query');
  const isCustomOnly = legacyRetrievalMode === 'custom_only';
  const alertRetrievalMode =
    paramsWorkflowConfig?.alertRetrievalMode === 'esql' ? 'esql' : 'custom_query';
  const alertRetrievalWorkflowIds =
    paramsWorkflowConfig?.alertRetrievalWorkflowIds ??
    getDefaultWorkflowConfig().alert_retrieval_workflow_ids;

  // Use the alerting framework's execution ID so that tracking events
  // written by executeGenerationWorkflow are queryable by the same ID
  // that appears in the rule execution log (and in the UI).
  const executionUuid = options.executionId ?? uuidv4();
  const tracedLogger = createTracedLogger(deps.logger, executionUuid);

  tracedLogger.info(`Starting workflow executor for space '${spaceId}'`);

  const sourceMetadata: SourceMetadata = {
    actionExecutionUuid: executionUuid,
    ruleId: rule.id,
    ruleName: rule.name,
  };

  const scheduleInfo = {
    actions: rule.actions.map(({ actionTypeId }) => actionTypeId),
    id: rule.id,
    interval: rule.schedule.interval,
  };

  // On the scheduled path the active APM transaction carries an `alerting_rule_id`
  // label, which trips a missing private API in the platform workflow runtime
  // (`apm.setCurrentTransaction is not a function`). Deferring `runWorkflow` to
  // Task Manager via `scheduleWorkflow` keeps the platform on its safe code path
  // (the task-manager transaction has no `alerting_rule_id`).
  const scheduledWorkflowsManagementApi =
    deps.workflowsManagementApi != null
      ? wrapManagementApiForScheduledExecution(deps.workflowsManagementApi)
      : deps.workflowsManagementApi;

  const { pluginsStart } = await deps.getStartServices();
  const { authz } = pluginsStart.security;

  try {
    const orchestrationOutcome = await executeGenerationWorkflow({
      alertsIndexPattern,
      analytics: deps.analytics,
      apiConfig,
      authz,
      checkIntegrity: (() => {
        const { workflowsExtensions, workflowsManagementApi } = deps;
        if (workflowsManagementApi == null || workflowsExtensions == null) {
          return undefined;
        }
        return ({ logger: checkLogger, spaceId: checkSpaceId }) =>
          checkManagedWorkflowIntegrity({
            analytics: deps.analytics,
            logger: checkLogger,
            spaceId: checkSpaceId,
            workflowsExtensions,
          });
      })(),
      // Injected so the FF-on scheduled cross-execution de-duplication in the
      // validation layer computes byte-identical alert hashes to this executor
      // (the shared @kbn/discoveries package cannot import the Node.js `crypto`
      // builtin).
      computeSha256Hash,
      end,
      esClient: scopedClusterClient.asCurrentUser,
      executionUuid,
      filter: combinedFilter as Record<string, unknown> | undefined,
      getEventLogIndex: deps.getEventLogIndex,
      getEventLogger: deps.getEventLogger,
      getInferredPrebuiltStepTypes,
      getStartServices: deps.getStartServices,
      logger: tracedLogger,
      request: deps.request,
      scheduleInfo,
      // The orchestration can outlive the rule task's timeout. Forward the alerting
      // framework's cancellation probe so executeGenerationWorkflow fails loudly (and
      // writes a terminal generation-failed event) instead of reporting discoveries
      // that the framework would silently discard after cancellation.
      shouldStopExecution: services.shouldStopExecution,
      size,
      source: 'scheduled',
      sourceMetadata,
      start,
      trigger: 'schedule',
      type: DEFAULT_INSIGHT_TYPE,
      workflowConfig: {
        alert_retrieval_mode: alertRetrievalMode,
        alert_retrieval_workflow_ids: alertRetrievalWorkflowIds,
        alert_retrieval_workflows_enabled: isComposite
          ? paramsWorkflowConfig?.alertRetrievalWorkflowsEnabled ?? false
          : alertRetrievalWorkflowIds.length > 0,
        default_retrieval_enabled: isComposite
          ? paramsWorkflowConfig?.defaultRetrievalEnabled ?? false
          : !isCustomOnly,
        ...(paramsWorkflowConfig?.esqlQuery != null
          ? { esql_query: paramsWorkflowConfig.esqlQuery }
          : {}),
        skill_enabled: isComposite ? paramsWorkflowConfig?.skillEnabled ?? true : true,
        validation_workflow_id:
          paramsWorkflowConfig?.validationWorkflowId ??
          getDefaultWorkflowConfig().validation_workflow_id,
      },
      workflowsManagementApi: scheduledWorkflowsManagementApi,
    });

    // Defensive guard: the orchestration workflow may return 'validation_failed' at runtime
    // even though the TypeScript type only models the success case.
    if ((orchestrationOutcome as { outcome: string }).outcome === 'validation_failed') {
      throw new Error('Attack discovery validation step failed');
    }

    tracedLogger.info('Workflow executor completed successfully');

    if (orchestrationOutcome.outcome === 'validation_succeeded') {
      const { alertRetrievalResult, generationResult, validationResult } = orchestrationOutcome;
      const discoveriesToPersist = validationResult.discoveriesToPersist ?? [];

      // R1/R4: scheduled rules report exactly the discoveries handed to the persist step.
      // An empty/absent handover (e.g. a custom validation workflow that never invoked the
      // persist step) is a noop — nothing is reported to the alerting framework.
      if (discoveriesToPersist.length === 0) {
        tracedLogger.warn(
          'Validation workflow completed with no discoveries to persist; skipping alertsClient reporting'
        );

        return { state: {} };
      }

      const attackDiscoveries = discoveriesToPersist.map(normalizeAttackDiscovery);
      const replacements: Replacements = generationResult.replacements;

      const alertsParams = {
        alertsContextCount: alertRetrievalResult.alertsContextCount,
        anonymizedAlerts: alertRetrievalResult.anonymizedAlerts.map((alert) => ({
          id: alert.id,
          metadata: alert.metadata,
          pageContent: alert.page_content,
        })),
        apiConfig,
        connectorName: apiConfig.name,
        enableFieldRendering: true,
        replacements,
        withReplacements: false,
      };

      const attacks = await Promise.all(
        attackDiscoveries.map(async (attackDiscovery) => {
          const alertInstanceId = generateAttackDiscoveryAlertHash({
            attackDiscovery,
            computeSha256Hash,
            connectorId: apiConfig.connectorId,
            ownerId: rule.id,
            replacements,
            spaceId,
          });

          const { uuid: alertDocId } = alertsClient.report({
            actionGroup: 'default',
            id: alertInstanceId,
          });

          const baseAlertDocument = transformToBaseAlertDocument({
            alertDocId,
            alertInstanceId,
            alertsParams,
            attackDiscovery,
            publicBaseUrl: deps.publicBaseUrl,
            spaceId,
          });

          const { alertIds, mitreAttackTactics, timestamp } = attackDiscovery;
          const { detailsMarkdown, entitySummaryMarkdown, summaryMarkdown, title } =
            getAttackDiscoveryMarkdownFields({
              attackDiscovery,
              replacements,
            });

          const context: AttackDiscoveryScheduleContext = {
            attack: {
              alertIds,
              detailsMarkdown,
              detailsUrl: baseAlertDocument[ALERT_URL],
              entitySummaryMarkdown,
              mitreAttackTactics,
              summaryMarkdown,
              timestamp,
              title,
            },
          };

          alertsClient.setAlertData({
            context,
            id: alertInstanceId,
            payload: baseAlertDocument,
          });

          return { alertIds: attackDiscovery.alertIds, attackId: alertDocId };
        })
      );

      tracedLogger.info(`Reported ${attackDiscoveries.length} attack discoveries to alertsClient`);

      const esClient = scopedClusterClient.asCurrentUser;

      // Best-effort: a back-fill failure must not fail an otherwise-successful
      // scheduled generation (mirrors the ad-hoc path).
      await backfillAttackIdsBestEffort({
        alertIdToAttackIdsMap: buildAlertIdToAttackIdsMap({ attacks }),
        esClient,
        logger: tracedLogger,
        spaceId,
      });
    }
  } catch (error) {
    tracedLogger.error(
      `Workflow executor failed: ${error instanceof Error ? error.message : String(error)}`
    );

    const transformedError = transformError(error);

    if (transformedError.statusCode >= 400 && transformedError.statusCode < 500) {
      throw createTaskRunError(
        error instanceof Error ? error : new Error(String(error)),
        TaskErrorSource.USER
      );
    }

    throw error;
  }

  return { state: {} };
};
