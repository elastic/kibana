/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { AnalyticsServiceSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import type {
  AttackDiscoveryExecutorOptions,
  AttackDiscoveryScheduleContext,
} from '@kbn/attack-discovery-schedules-common';
import {
  generateAttackDiscoveryAlertHash,
  transformToBaseAlertDocument,
  updateAlertsWithAttackIds,
} from '@kbn/attack-discovery-schedules-common';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
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
  GetStartServices,
  WorkflowConfig,
} from '@kbn/discoveries/impl/attack_discovery/generation/types';
import type { SourceMetadata } from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';
import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import {
  executeGenerationWorkflow,
  getInferredPrebuiltStepTypes,
} from '../../../routes/generate/helpers';
import { checkManagedWorkflowIntegrity } from '../../../managed_workflows/check_managed_workflow_integrity';

const DEFAULT_INSIGHT_TYPE = 'attack_discovery';

const computeSha256Hash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

/**
 * Normalizes attack discovery objects that may arrive with snake_case keys
 * (from workflow execution output) to the camelCase format expected by
 * `generateAttackDiscoveryAlertHash`, `getAttackDiscoveryMarkdownFields`,
 * and `transformToBaseAlertDocument`.
 */
const normalizeAttackDiscovery = (raw: unknown): AttackDiscovery => {
  const d = raw as Record<string, unknown>;

  return {
    alertIds: (d.alertIds ?? d.alert_ids ?? []) as string[],
    detailsMarkdown: (d.detailsMarkdown ?? d.details_markdown ?? '') as string,
    entitySummaryMarkdown: (d.entitySummaryMarkdown ?? d.entity_summary_markdown) as
      | string
      | undefined,
    id: d.id as string | undefined,
    mitreAttackTactics: (d.mitreAttackTactics ?? d.mitre_attack_tactics) as string[] | undefined,
    summaryMarkdown: (d.summaryMarkdown ?? d.summary_markdown ?? '') as string,
    timestamp: (d.timestamp ?? '') as string,
    title: (d.title ?? '') as string,
  } as AttackDiscovery;
};

const getDefaultWorkflowConfig = (): WorkflowConfig => ({
  alert_retrieval_mode: 'custom_query',
  alert_retrieval_workflow_ids: [],
  validation_workflow_id: 'default',
});

export interface WorkflowExecutorDeps {
  analytics?: AnalyticsServiceSetup;
  getEventLogIndex: GetEventLogIndex;
  getEventLogger: GetEventLogger;
  getStartServices: GetStartServices;
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
        defaultAlertRetrievalEnabled?: boolean;
        esqlQuery?: string;
        validationWorkflowId?: string;
      }
    | undefined;

  // Support both new (alertRetrievalMode) and legacy (defaultAlertRetrievalEnabled) formats
  const alertRetrievalMode =
    paramsWorkflowConfig?.alertRetrievalMode ??
    (paramsWorkflowConfig?.defaultAlertRetrievalEnabled === false ? 'custom_only' : 'custom_query');

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

  try {
    const orchestrationOutcome = await executeGenerationWorkflow({
      alertsIndexPattern,
      analytics: deps.analytics,
      apiConfig,
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
      size,
      source: 'scheduled',
      sourceMetadata,
      start,
      trigger: 'schedule',
      type: DEFAULT_INSIGHT_TYPE,
      workflowConfig: {
        alert_retrieval_mode: alertRetrievalMode,
        alert_retrieval_workflow_ids:
          paramsWorkflowConfig?.alertRetrievalWorkflowIds ??
          getDefaultWorkflowConfig().alert_retrieval_workflow_ids,
        esql_query: paramsWorkflowConfig?.esqlQuery,
        validation_workflow_id:
          paramsWorkflowConfig?.validationWorkflowId ??
          getDefaultWorkflowConfig().validation_workflow_id,
      },
      workflowsManagementApi: deps.workflowsManagementApi,
    });

    // Defensive guard: the orchestration workflow may return 'validation_failed' at runtime
    // even though the TypeScript type only models the success case.
    if ((orchestrationOutcome as { outcome: string }).outcome === 'validation_failed') {
      throw new Error('Attack discovery validation step failed');
    }

    tracedLogger.info('Workflow executor completed successfully');

    if (orchestrationOutcome.outcome === 'validation_succeeded') {
      const { alertRetrievalResult, generationResult } = orchestrationOutcome;
      const attackDiscoveries = generationResult.attackDiscoveries.map(normalizeAttackDiscovery);
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

      const alertIdToAttackIds: Record<string, string[]> = {};

      await Promise.all(
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

          for (const alertId of attackDiscovery.alertIds) {
            alertIdToAttackIds[alertId] = alertIdToAttackIds[alertId] ?? [];
            alertIdToAttackIds[alertId].push(alertDocId);
          }

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
        })
      );

      tracedLogger.info(`Reported ${attackDiscoveries.length} attack discoveries to alertsClient`);

      const esClient = scopedClusterClient.asCurrentUser;

      await updateAlertsWithAttackIds({
        alertIdToAttackIdsMap: alertIdToAttackIds,
        esClient,
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
