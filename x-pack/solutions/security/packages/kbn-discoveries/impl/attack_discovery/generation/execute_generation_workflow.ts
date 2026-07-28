/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import dateMath from '@kbn/datemath';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import moment from 'moment';
import { uniq } from 'lodash/fp';
import { ERROR_CATEGORIES, type ErrorCategory } from '@kbn/discoveries-schemas';
import type {
  AttackDiscoverySource,
  DiagnosticsContext,
  SourceMetadata,
} from '../persistence/event_logging';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  writeAttackDiscoveryEvent,
} from '../persistence/event_logging';
import { getDurationNanoseconds } from '../../lib/persistence';

import { reportMisconfiguration } from '../../lib/telemetry/report_misconfiguration';
import {
  reportWorkflowError,
  reportWorkflowSuccess,
} from '../../lib/telemetry/report_workflow_telemetry';
import type { MisconfigurationType } from '../../lib/telemetry/event_based_telemetry';
import { getSpaceId } from '../../lib/helpers/get_space_id';
import { isWorkflowsEnabled } from '../../lib/helpers/is_workflows_enabled';
import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';
import { assertAttackDiscoveryType } from './assert_attack_discovery_type';
import { assertAuthorizedToExecuteWorkflows } from './assert_authorized_to_execute_workflows';
import { buildResolveConnector } from './build_resolve_connector';
import { createAuthenticatedUserForEventLogging } from './create_authenticated_user_for_event_logging';
import { fetchAnonymizationFields } from './fetch_anonymization_fields';
import { getParsedApiConfig } from './get_parsed_api_config';
import { getWorkflowLoadingMessage } from './get_workflow_loading_message';
import { refreshEventLogIndex } from './refresh_event_log_index';
import { resolveDefaultWorkflowIds } from './resolve_default_workflow_ids';
import { validatePreExecution } from './validate_pre_execution';
import { verifyWorkflowIntegrity } from './verify_workflow_integrity';
import { type WorkflowsManagementApi } from './invoke_alert_retrieval_workflow';
import {
  PipelineStepError,
  runManualOrchestration,
  type ManualOrchestrationOutcome,
} from './run_manual_orchestration';
import type {
  DefaultWorkflowIds,
  ExecuteGenerationWorkflowParams,
  ParsedApiConfig,
  WorkflowConfig,
  WorkflowIntegrityResult,
} from './types';
import type { PreExecutionIssue } from './validate_pre_execution';
import { writeGenerationStartedEvent } from './write_generation_started_event';

const CHECK_TO_MISCONFIGURATION_TYPE: Record<string, MisconfigurationType> = {
  alertsIndex: 'alerts_index_missing',
  connectorAccessibility: 'connector_unreachable',
  managedWorkflowEnabled: 'managed_workflow_disabled',
  workflowsManagementApi: 'default_workflows_resolution_failed',
};

const reportPreExecutionMisconfigurations = ({
  analytics,
  issues,
  logger,
  spaceId,
}: {
  analytics: NonNullable<ExecuteGenerationWorkflowParams['analytics']>;
  issues: PreExecutionIssue[];
  logger: Logger;
  spaceId?: string;
}): void => {
  for (const issue of issues) {
    const misconfigurationType = CHECK_TO_MISCONFIGURATION_TYPE[issue.check];

    if (misconfigurationType != null) {
      reportMisconfiguration({
        analytics,
        logger,
        params: {
          detail: issue.message,
          misconfiguration_type: misconfigurationType,
          space_id: spaceId,
        },
      });
    }
  }
};

/**
 * Writes a generation-failed event to the event log so the UI can display the
 * failure status instead of remaining stuck in "loading" state forever.
 */
const writeGenerationFailedEvent = async ({
  authenticatedUser,
  connectorId,
  endTime,
  errorCategory,
  errorMessage,
  eventLogger,
  eventLogIndex,
  executionUuid,
  failedWorkflowId,
  logger,
  source: failedSource,
  sourceMetadata: failedSourceMetadata,
  spaceId,
  startTime,
  workflowId,
}: {
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  endTime: Date;
  errorCategory?: ErrorCategory;
  errorMessage: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  failedWorkflowId?: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  startTime: Date;
  workflowId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      errorCategory,
      eventLogger,
      eventLogIndex,
      executionUuid,
      failedWorkflowId,
      message: `Attack discovery generation ${executionUuid} failed: ${errorMessage}`,
      outcome: 'failure',
      reason: errorMessage,
      source: failedSource,
      sourceMetadata: failedSourceMetadata,
      spaceId,
      start: startTime,
      workflowId,
    });
  } catch (loggingError) {
    logger.error(
      `Failed to write generation-failed event: ${
        loggingError instanceof Error ? loggingError.message : String(loggingError)
      }`
    );
  }
};

const getTimeRangeDuration = ({
  end: endRange,
  start: startRange,
}: {
  end?: string;
  start?: string;
}): { dateRangeDuration: number; isDefaultDateRange: boolean } => {
  if (startRange != null && endRange != null) {
    const forceNow = moment().toDate();
    const dateStart = dateMath.parse(startRange, {
      forceNow,
      momentInstance: moment,
      roundUp: false,
    });
    const dateEnd = dateMath.parse(endRange, { forceNow, momentInstance: moment, roundUp: false });

    if (dateStart != null && dateEnd != null) {
      return {
        dateRangeDuration: dateEnd.diff(dateStart),
        isDefaultDateRange: false,
      };
    }
  }

  return { dateRangeDuration: 0, isDefaultDateRange: true };
};

/**
 * Assembles the DiagnosticsContext written to the generation-started event from
 * pre-execution checks, workflow integrity, and a config summary.
 */
const buildDiagnosticsContext = ({
  integrityResult,
  parsedApiConfig,
  preExecutionResult,
  verifiedWorkflowIds,
  workflowConfig,
}: {
  integrityResult: WorkflowIntegrityResult | null;
  parsedApiConfig: ParsedApiConfig;
  preExecutionResult: { issues: PreExecutionIssue[]; valid: boolean };
  verifiedWorkflowIds: DefaultWorkflowIds | null;
  workflowConfig: WorkflowConfig;
}): DiagnosticsContext => ({
  config: {
    alertRetrievalMode: workflowConfig.alert_retrieval_mode,
    alertRetrievalWorkflowCount: workflowConfig.alert_retrieval_workflow_ids.length,
    connectorType: parsedApiConfig.action_type_id,
    hasCustomValidation:
      workflowConfig.validation_workflow_id !== '' &&
      workflowConfig.validation_workflow_id !== verifiedWorkflowIds?.validate,
  },
  preExecutionChecks: preExecutionResult.issues.map((issue) => ({
    check: issue.check,
    message: issue.message,
    passed: false,
    severity: issue.severity,
  })),
  workflowIntegrity:
    integrityResult != null
      ? {
          repaired: (integrityResult.repaired ?? []).map(({ key, workflowId }) => ({
            key,
            workflowId,
          })),
          status: integrityResult.status,
          unrepairableErrors: (integrityResult.unrepairableErrors ?? []).map(
            ({ error, key, workflowId }) => ({ error, key, workflowId })
          ),
        }
      : {
          repaired: [],
          status: 'all_intact' as const,
          unrepairableErrors: [],
        },
});

/**
 * Reports the workflow-success telemetry event, deriving the per-outcome counts
 * from the orchestration result.
 */
const reportGenerationSuccessTelemetry = ({
  analytics,
  end,
  filter,
  getInferredPrebuiltStepTypes,
  logger,
  orchestrationOutcome,
  parsedApiConfig,
  pipelineStartTime,
  scheduleInfo,
  size,
  start,
  trigger,
  verifiedWorkflowIds,
  workflowConfig,
}: {
  analytics: NonNullable<ExecuteGenerationWorkflowParams['analytics']>;
  end: ExecuteGenerationWorkflowParams['end'];
  filter: ExecuteGenerationWorkflowParams['filter'];
  getInferredPrebuiltStepTypes: ExecuteGenerationWorkflowParams['getInferredPrebuiltStepTypes'];
  logger: Logger;
  orchestrationOutcome: ManualOrchestrationOutcome;
  parsedApiConfig: ParsedApiConfig;
  pipelineStartTime: Date;
  scheduleInfo: ExecuteGenerationWorkflowParams['scheduleInfo'];
  size: ExecuteGenerationWorkflowParams['size'];
  start: ExecuteGenerationWorkflowParams['start'];
  trigger: ExecuteGenerationWorkflowParams['trigger'];
  verifiedWorkflowIds: DefaultWorkflowIds;
  workflowConfig: WorkflowConfig;
}): void => {
  const durationMs = Date.now() - pipelineStartTime.getTime();
  const { dateRangeDuration, isDefaultDateRange } = getTimeRangeDuration({ end, start });
  const usesDefaultRetrieval = workflowConfig.default_retrieval_enabled;
  const usesDefaultValidation =
    workflowConfig.validation_workflow_id === '' ||
    workflowConfig.validation_workflow_id === verifiedWorkflowIds.validate;

  const alertsCount =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? uniq(
          (
            orchestrationOutcome.generationResult.attackDiscoveries as Array<{
              alertIds?: string[];
            }>
          ).flatMap((d) => d.alertIds ?? [])
        ).length
      : 0;

  const discoveriesGenerated =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? orchestrationOutcome.generationResult.attackDiscoveries?.length ?? 0
      : 0;

  const alertsContextCount =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? orchestrationOutcome.generationResult.alertsContextCount
      : 0;

  const validationDiscoveriesCount =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? orchestrationOutcome.validationResult.validationSummary.persistedCount
      : undefined;

  const duplicatesDroppedCount =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? orchestrationOutcome.validationResult.duplicatesDroppedCount
      : undefined;

  const hallucinationsFilteredCount =
    orchestrationOutcome.outcome === 'validation_succeeded'
      ? orchestrationOutcome.validationResult.validationSummary.hallucinationsFilteredCount
      : undefined;

  reportWorkflowSuccess({
    analytics,
    logger,
    params: {
      actionTypeId: parsedApiConfig.action_type_id,
      alertsContextCount,
      alertsCount,
      configuredAlertsCount: size ?? 0,
      custom_retrieval_workflow_count: workflowConfig.alert_retrieval_workflow_ids.length,
      dateRangeDuration,
      alert_retrieval_mode: workflowConfig.alert_retrieval_mode,
      discoveriesGenerated,
      duplicatesDroppedCount,
      durationMs,
      execution_mode: 'workflow',
      hallucinations_filtered_count: hallucinationsFilteredCount,
      hasFilter: filter != null,
      isDefaultDateRange,
      model: parsedApiConfig.model,
      prebuilt_step_types_used:
        getInferredPrebuiltStepTypes?.({
          defaultValidationWorkflowId: verifiedWorkflowIds.validate,
          workflowConfig,
        }) ?? [],
      provider: parsedApiConfig.provider,
      retrieval_workflow_count:
        workflowConfig.alert_retrieval_workflow_ids.length + (usesDefaultRetrieval ? 1 : 0),
      scheduleInfo,
      trigger: trigger ?? 'unknown',
      uses_default_retrieval: usesDefaultRetrieval,
      uses_default_validation: usesDefaultValidation,
      validation_discoveries_count: validationDiscoveriesCount,
    },
  });
};

/**
 * Handles a failed generation: logs the error, reports failure telemetry, and
 * writes a generation-failed event so the UI can leave the "loading" state.
 */
const handleGenerationFailure = async ({
  analytics,
  authenticatedUser,
  coreStart,
  err,
  esClient,
  eventLogIndex,
  eventLogger,
  executionUuid,
  generationWorkflowId,
  logger,
  parsedApiConfig,
  pipelineStartTime,
  preExecutionResult,
  request,
  scheduleInfo,
  source,
  sourceMetadata,
  spaceId,
  trigger,
}: {
  analytics: ExecuteGenerationWorkflowParams['analytics'];
  authenticatedUser: AuthenticatedUser | undefined;
  coreStart: CoreStart | undefined;
  err: unknown;
  esClient: ElasticsearchClient | undefined;
  eventLogIndex: string | undefined;
  eventLogger: IEventLogger | undefined;
  executionUuid: string;
  generationWorkflowId: string | undefined;
  logger: Logger;
  parsedApiConfig: ParsedApiConfig | undefined;
  pipelineStartTime: Date;
  preExecutionResult: { issues: PreExecutionIssue[]; valid: boolean } | undefined;
  request: KibanaRequest;
  scheduleInfo: ExecuteGenerationWorkflowParams['scheduleInfo'];
  source: ExecuteGenerationWorkflowParams['source'];
  sourceMetadata: ExecuteGenerationWorkflowParams['sourceMetadata'];
  spaceId: string | undefined;
  trigger: ExecuteGenerationWorkflowParams['trigger'];
}): Promise<void> => {
  const message = err instanceof Error ? err.message : String(err);

  const failedStep = err instanceof PipelineStepError ? err.step : undefined;
  const misconfigurationDetected = preExecutionResult != null && !preExecutionResult.valid;

  const errorCategory =
    err instanceof PipelineStepError
      ? err.errorCategory
      : err instanceof AttackDiscoveryError
      ? err.errorCategory
      : undefined;
  const failedWorkflowId =
    err instanceof PipelineStepError
      ? err.failedWorkflowId
      : err instanceof AttackDiscoveryError
      ? err.workflowId
      : undefined;

  if (analytics != null && parsedApiConfig != null) {
    reportWorkflowError({
      analytics,
      logger,
      params: {
        actionTypeId: parsedApiConfig.action_type_id,
        errorMessage: message,
        execution_mode: 'workflow',
        failed_step: failedStep,
        misconfiguration_detected: misconfigurationDetected,
        model: parsedApiConfig.model,
        provider: parsedApiConfig.provider,
        scheduleInfo,
        trigger: trigger ?? 'unknown',
      },
    });
  }

  // Write a generation-failed event so the UI can detect the failure
  // (instead of remaining stuck in "loading" state forever)
  if (
    authenticatedUser != null &&
    parsedApiConfig != null &&
    eventLogger != null &&
    eventLogIndex != null &&
    spaceId != null
  ) {
    await writeGenerationFailedEvent({
      authenticatedUser,
      connectorId: parsedApiConfig.connector_id,
      endTime: new Date(),
      errorCategory,
      errorMessage: message,
      eventLogger,
      eventLogIndex,
      executionUuid,
      failedWorkflowId,
      logger,
      source,
      sourceMetadata,
      spaceId,
      startTime: pipelineStartTime,
      workflowId: generationWorkflowId ?? 'unknown',
    });

    // Refresh the index so the failure is immediately visible to the UI poller.
    // Without this, the UI remains stuck in "loading" state until the next
    // periodic ES refresh fires (up to 1 second by default).
    if (coreStart != null) {
      await refreshEventLogIndex({
        coreStart,
        esClient,
        eventLogIndex,
        logger,
        request,
      });
    }
  }
};

export async function executeGenerationWorkflow({
  alerts,
  alertsIndexPattern,
  analytics,
  apiConfig,
  authz,
  checkIntegrity,
  computeSha256Hash,
  end,
  esClient: preAuthenticatedEsClient,
  executionUuid,
  filter,
  getEventLogIndex,
  getEventLogger,
  getInferredPrebuiltStepTypes,
  getStartServices,
  logger,
  request,
  scheduleInfo,
  shouldStopExecution,
  size,
  source,
  sourceMetadata,
  start,
  trigger,
  type,
  workflowConfig,
  workflowsManagementApi,
}: ExecuteGenerationWorkflowParams): Promise<ManualOrchestrationOutcome> {
  // Track these outside try block so they're available in the catch for event writing
  let authenticatedUser: AuthenticatedUser | undefined;
  let coreStart: Awaited<ReturnType<typeof getStartServices>>['coreStart'] | undefined;
  let esClient: ElasticsearchClient | undefined;
  let parsedApiConfig: ParsedApiConfig | undefined;
  let eventLogger: IEventLogger | undefined;
  let eventLogIndex: string | undefined;
  let preExecutionResult: { issues: PreExecutionIssue[]; valid: boolean } | undefined;
  let spaceId: string | undefined;
  let generationWorkflowId: string | undefined;
  const pipelineStartTime = new Date();

  try {
    logger.info(`Starting ${type} generation workflow`);

    const startServices = await getStartServices();
    coreStart = startServices.coreStart;
    const { pluginsStart } = startServices;

    // Universal kill-switch backstop for every AD 2.0 generation surface (ad hoc,
    // scheduled, agent-builder run tool, and workflow run-step). When the feature
    // flag is OFF no real work is performed: this throws before authorization,
    // anonymization, alert retrieval, LLM generation, and event-log writes.
    if (!(await isWorkflowsEnabled(coreStart.featureFlags))) {
      throw new Error('Attack Discovery workflows are not enabled');
    }

    const { spaces: spacesPlugin } = pluginsStart as { spaces?: SpacesPluginStart };

    spaceId = getSpaceId({
      request,
      spaces: spacesPlugin?.spacesService,
    });

    // Authoritative authorization guard (sole choke point for ALL four AD 2.0
    // surfaces: ad hoc, scheduled, agent-builder tool, and workflow run-step).
    // Runs before any work so unauthorized principals never reach any
    // runWorkflow/scheduleWorkflow call under runManualOrchestration. On throw,
    // the catch below routes through handleGenerationFailure.
    await assertAuthorizedToExecuteWorkflows({ authz, request, spaceId });

    parsedApiConfig = getParsedApiConfig(apiConfig);

    assertAttackDiscoveryType({ type });

    logger.debug(() => {
      return `Invoking generation workflow with config: ${JSON.stringify({
        alert_retrieval_mode: workflowConfig.alert_retrieval_mode,
        alert_retrieval_workflow_ids: workflowConfig.alert_retrieval_workflow_ids,
        alerts_index_pattern: alertsIndexPattern,
        end,
        esql_query: workflowConfig.esql_query,
        filter,
        size,
        space_id: spaceId,
        start,
        validation_workflow_id: workflowConfig.validation_workflow_id,
      })}`;
    });

    eventLogger = await getEventLogger();
    eventLogIndex = await getEventLogIndex();

    esClient =
      preAuthenticatedEsClient ?? coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

    const authenticationInfo = await esClient.security.authenticate();

    authenticatedUser = createAuthenticatedUserForEventLogging({ authenticationInfo });

    const anonymizationFields = await fetchAnonymizationFields({
      esClient,
      logger,
      spaceId,
    });

    const hasProvidedAlerts = alerts != null && alerts.length > 0;
    const loadingMessage = getWorkflowLoadingMessage({
      alertsCount: size ?? 0,
      end,
      ...(hasProvidedAlerts ? { providedAlertsCount: alerts.length } : {}),
      start,
      workflowConfig,
    });

    const defaultWorkflowIds = resolveDefaultWorkflowIds();

    // verifyWorkflowIntegrity checks managed workflow integrity via the platform API and
    // returns the up-to-date IDs. checkIntegrity is injected by the plugin caller and
    // bound to the workflowsManagementApi — the package never imports plugin code directly.
    const resolvedSpaceId = spaceId;
    const boundCheckIntegrity =
      checkIntegrity != null && resolvedSpaceId != null
        ? () => checkIntegrity({ logger, spaceId: resolvedSpaceId })
        : undefined;

    const { integrityResult, updatedIds: verifiedWorkflowIds } = await verifyWorkflowIntegrity({
      checkIntegrity: boundCheckIntegrity,
      defaultWorkflowIds,
      logger,
    });

    const connectorId = parsedApiConfig.connector_id;
    const resolveConnector = buildResolveConnector({
      connectorId,
      getStartServices,
      request,
    });

    preExecutionResult = await validatePreExecution({
      alertsIndexPattern,
      connectorId,
      esClient,
      logger,
      resolveConnector,
      workflowIntegrityResult: integrityResult,
      workflowsManagementApi,
    });

    if (preExecutionResult.issues.length > 0 && analytics != null) {
      reportPreExecutionMisconfigurations({
        analytics,
        issues: preExecutionResult.issues,
        logger,
        spaceId,
      });
    }

    // Assemble DiagnosticsContext from pre-execution checks + workflow integrity + config summary.
    // Written to the generation-started event so the pipeline_data route can surface it to the UI.
    const diagnosticsContext: DiagnosticsContext = buildDiagnosticsContext({
      integrityResult,
      parsedApiConfig,
      preExecutionResult,
      verifiedWorkflowIds,
      workflowConfig,
    });

    if (!preExecutionResult.valid) {
      const criticalMessages = preExecutionResult.issues
        .filter((i) => i.severity === 'critical')
        .map((i) => i.message);

      throw new Error(criticalMessages.join('; '));
    }

    if (verifiedWorkflowIds == null || workflowsManagementApi == null) {
      throw new Error('Pre-execution validation passed but critical dependencies are missing');
    }

    generationWorkflowId = verifiedWorkflowIds.generation;

    /**
     * Manual orchestration can take minutes (polling for workflow completion).
     * We write the overall generation-started event up front so the UI can
     * immediately observe that the generation has begun.
     */
    await writeGenerationStartedEvent({
      authenticatedUser,
      connectorId: parsedApiConfig.connector_id,
      diagnosticsContext,
      eventLogger,
      eventLogIndex,
      executionUuid,
      loadingMessage,
      source,
      sourceMetadata,
      spaceId,
      workflowId: generationWorkflowId,
    });

    await refreshEventLogIndex({
      coreStart,
      esClient,
      eventLogIndex,
      logger,
      request,
    });

    /** Manual workflow invocation: runs bundled workflows sequentially. */
    const workflowsApi = workflowsManagementApi as WorkflowsManagementApi;
    const basePath = coreStart.http.basePath.get(request);
    const orchestrationOutcome = await runManualOrchestration({
      alerts,
      alertsIndexPattern,
      analytics,
      anonymizationFields,
      apiConfig: parsedApiConfig,
      authenticatedUser,
      basePath,
      computeSha256Hash,
      defaultWorkflowIds: verifiedWorkflowIds,
      end,
      esClient,
      eventLogger,
      eventLogIndex,
      executionUuid,
      filter,
      logger,
      request,
      size,
      source,
      sourceMetadata,
      spaceId,
      start,
      trigger,
      workflowConfig,
      workflowsManagementApi: workflowsApi,
    });

    // Remove this when the alerting framework adds a way to abort rule execution:
    // https://github.com/elastic/kibana/issues/219152
    //
    // The orchestration above can run longer than the rule task's timeout. Once the
    // task has been cancelled, the alerting framework silently discards any alerts the
    // rule executor reports afterwards, so treating this as a success would surface a
    // misleading "ran successfully" result while persisting nothing to the scheduled
    // index. Throw so the failure flows through `handleGenerationFailure`, which writes
    // a terminal generation-failed event (the UI status transform prioritizes `failed`
    // over the already-written `succeeded`) and propagates the error to fail the rule.
    if (shouldStopExecution?.() === true) {
      throw new AttackDiscoveryError({
        errorCategory: ERROR_CATEGORIES.timeout,
        message: 'Rule execution cancelled due to timeout',
        workflowId: generationWorkflowId,
      });
    }

    if (analytics != null) {
      reportGenerationSuccessTelemetry({
        analytics,
        end,
        filter,
        getInferredPrebuiltStepTypes,
        logger,
        orchestrationOutcome,
        parsedApiConfig,
        pipelineStartTime,
        scheduleInfo,
        size,
        start,
        trigger,
        verifiedWorkflowIds,
        workflowConfig,
      });
    }

    return orchestrationOutcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Generation workflow failed: ${message}`, err);

    await handleGenerationFailure({
      analytics,
      authenticatedUser,
      coreStart,
      err,
      esClient,
      eventLogIndex,
      eventLogger,
      executionUuid,
      generationWorkflowId,
      logger,
      parsedApiConfig,
      pipelineStartTime,
      preExecutionResult,
      request,
      scheduleInfo,
      source,
      sourceMetadata,
      spaceId,
      trigger,
    });

    throw err;
  }
}
