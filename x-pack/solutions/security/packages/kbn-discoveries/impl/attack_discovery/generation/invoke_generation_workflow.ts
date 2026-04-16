/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import type { AttackDiscoverySource, SourceMetadata } from '../persistence/event_logging';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  writeAttackDiscoveryEvent,
} from '../persistence/event_logging';
import { getDurationNanoseconds } from '../../lib/persistence';

import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';

import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';
import { pollForWorkflowCompletion } from './poll_for_workflow_completion';
import type {
  ParsedApiConfig,
  WorkflowConfig,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from './types';

/** Step type identifier used by the generation step in the workflow engine */
const GENERATION_STEP_TYPE = 'security.attack-discovery.generate';

/**
 * Result returned from the generation workflow.
 */
export interface GenerationWorkflowResult {
  alertsContextCount: number;
  attackDiscoveries: unknown[];
  executionUuid: string;
  replacements: Record<string, string>;
  workflowExecution?: WorkflowExecutionTracking;
  workflowId: string;
  workflowRunId: string;
}

type ExtractedGenerationWorkflowResult = Omit<
  GenerationWorkflowResult,
  'workflowExecution' | 'workflowId' | 'workflowRunId'
>;

/**
 * Parameters for invoking the generation workflow.
 */
export interface InvokeGenerationWorkflowParams {
  alertRetrievalResult: AlertRetrievalResult;
  alertsIndexPattern: string;
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  end?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  maxWaitMs?: number;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  start?: string;
  workflowId: string;
  workflowConfig: WorkflowConfig;
  workflowsManagementApi: WorkflowsManagementApi;
}

/**
 * Validated workflow type with required definition.
 */
type ValidatedWorkflow = WorkflowDetailDto & {
  definition: NonNullable<WorkflowDetailDto['definition']>;
};

/**
 * Validates that the workflow exists and is executable.
 * Throws an error if the workflow is invalid.
 * Returns the validated workflow with guaranteed non-null definition.
 */
const validateWorkflow = (
  workflow: WorkflowDetailDto | null,
  workflowId: string
): ValidatedWorkflow => {
  if (!workflow) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_deleted',
      message: `Generation workflow (id: ${workflowId}) not found. It may have been deleted. Reconfigure the generation workflow in Attack Discovery settings.`,
      workflowId,
    });
  }

  if (!workflow.definition) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Generation workflow '${workflow.name}' (id: ${workflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`,
      workflowId,
    });
  }

  if (!workflow.valid) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Generation workflow '${workflow.name}' (id: ${workflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`,
      workflowId,
    });
  }

  if (!workflow.enabled) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_disabled',
      message: `Generation workflow '${workflow.name}' (id: ${workflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`,
      workflowId,
    });
  }

  return workflow as ValidatedWorkflow;
};

/**
 * Builds the workflow inputs from the provided parameters.
 */
const buildWorkflowInputs = ({
  alertRetrievalResult,
  alertsIndexPattern,
  apiConfig,
  end,
  filter,
  logger,
  size,
  start,
  workflowConfig,
}: {
  alertRetrievalResult: AlertRetrievalResult;
  alertsIndexPattern: string;
  apiConfig: ParsedApiConfig;
  end?: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  size?: number;
  start?: string;
  workflowConfig: WorkflowConfig;
}): Record<string, unknown> => {
  return {
    ...(workflowConfig.additional_context != null
      ? { additional_context: workflowConfig.additional_context }
      : {}),
    // Pre-retrieved alerts (manual orchestration) - pass array directly, not stringified
    additional_alerts: alertRetrievalResult.alerts,
    alert_retrieval_workflow_ids: workflowConfig.alert_retrieval_workflow_ids,
    alerts_index_pattern: alertsIndexPattern,
    // LLM config
    api_config: {
      action_type_id: apiConfig.action_type_id,
      connector_id: apiConfig.connector_id,
      model: apiConfig.model,
    },
    // Connector name for validation step (use connectorName from retrieval if available)
    connector_name: alertRetrievalResult.connectorName ?? apiConfig.connector_id,
    end: end ?? undefined,
    esql_query: workflowConfig.esql_query,
    filter: filter ?? undefined,
    alert_retrieval_mode: workflowConfig.alert_retrieval_mode,
    replacements: alertRetrievalResult.replacements,
    validation_workflow_id: workflowConfig.validation_workflow_id,
    size: size ?? 100,
    start: start ?? undefined,
  };
};

/**
 * Parses raw replacements output from the generation step.
 * Returns an empty object if parsing fails or the value is absent.
 */
const parseReplacements = (value: unknown): Record<string, string> => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch {
      return {};
    }
  }
  if (value != null && typeof value === 'object') {
    return value as Record<string, string>;
  }
  return {};
};

/**
 * Extracts the generation workflow result from the workflow execution.
 */
const extractGenerationWorkflowResult = ({
  execution,
  executionUuid,
}: {
  execution: WorkflowExecutionDto;
  executionUuid: string;
}): ExtractedGenerationWorkflowResult => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: `Generation workflow failed: ${errorMessage}`,
      workflowId: execution.workflowId,
    });
  }

  if (execution.status === 'skipped') {
    throw new AttackDiscoveryError({
      errorCategory: 'concurrent_conflict',
      message:
        'Generation workflow was skipped: another generation workflow is already running in this space (maximum concurrent runs reached)',
      workflowId: execution.workflowId,
    });
  }

  const generationStep = execution.stepExecutions.find(
    (step) => step.stepType === GENERATION_STEP_TYPE
  );

  if (!generationStep) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: 'Generation step not found in generation workflow execution',
      workflowId: execution.workflowId,
    });
  }

  if (!generationStep.output) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message:
        'Generation step completed but produced no output. The LLM may have returned an empty or unparseable response. Check connector and model configuration.',
      workflowId: execution.workflowId,
    });
  }

  // The output is stored as JsonValue, so we need to cast it
  const output = generationStep.output as {
    alerts_context_count?: number;
    attack_discoveries?: unknown[];
    execution_uuid?: string;
    replacements?: Record<string, string> | string;
  };

  const parsedReplacements = parseReplacements(output.replacements);

  return {
    alertsContextCount: output.alerts_context_count ?? 0,
    attackDiscoveries: output.attack_discoveries ?? [],
    // Always use the orchestration UUID passed to invokeGenerationWorkflow, not the
    // workflow run ID that the generate step emits as output.execution_uuid. The
    // orchestration UUID is what the event log and the UI both track, so it must
    // flow through to the persisted discovery documents as ALERT_RULE_EXECUTION_UUID.
    executionUuid,
    replacements: parsedReplacements,
  };
};

/**
 * Writes the generation succeeded event to the event log.
 */
const writeGenerationSucceededEvent = async ({
  alertsContextCount,
  authenticatedUser,
  connectorId,
  endTime,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  source,
  sourceMetadata,
  spaceId,
  startTime,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: {
  alertsContextCount: number;
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  endTime: Date;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  spaceId: string;
  startTime: Date;
  workflowId: string;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generation ${executionUuid} succeeded`,
      outcome: 'success',
      source,
      sourceMetadata,
      spaceId,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write generation-succeeded event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Writes the generate step started event to the event log.
 */
const writeGenerateStepStartedEvent = async ({
  alertsContextCount,
  authenticatedUser,
  connectorId,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  providedAlerts,
  source,
  spaceId,
  startTime,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: {
  alertsContextCount: number;
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  /**
   * Pre-provided alert strings for 'provided' mode. Stored in event.reference
   * so the pipeline_data route can surface them during the running state, before
   * the workflow engine populates step.input.
   */
  providedAlerts?: string[];
  source?: AttackDiscoverySource;
  spaceId: string;
  startTime: Date;
  workflowId: string;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient: null,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generate step ${executionUuid} started`,
      providedAlerts,
      source,
      spaceId,
      start: startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write generate-step-started event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Writes the generate step succeeded event to the event log.
 */
const writeGenerateStepSucceededEvent = async ({
  alertsContextCount,
  authenticatedUser,
  connectorId,
  endTime,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  source,
  spaceId,
  startTime,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: {
  alertsContextCount: number;
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  endTime: Date;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  spaceId: string;
  startTime: Date;
  workflowId: string;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generate step ${executionUuid} succeeded`,
      outcome: 'success',
      source,
      spaceId,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write generate-step-succeeded event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Writes the generate step failed event to the event log.
 */
const writeGenerateStepFailedEvent = async ({
  alertsContextCount,
  authenticatedUser,
  connectorId,
  endTime,
  errorMessage,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  source,
  spaceId,
  startTime,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: {
  alertsContextCount: number;
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
  endTime: Date;
  errorMessage: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  source?: AttackDiscoverySource;
  spaceId: string;
  startTime: Date;
  workflowId: string;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED,
      alertsContextCount,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery generate step ${executionUuid} failed`,
      outcome: 'failure',
      reason: errorMessage,
      source,
      spaceId,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (loggingError) {
    logger.error(
      `Failed to write generate-step-failed event: ${
        loggingError instanceof Error ? loggingError.message : String(loggingError)
      }`
    );
  }
};

/**
 * Invokes the generation workflow with pre-retrieved alerts.
 * The generation workflow runs LLM generation using the provided alerts.
 *
 * The function:
 * 1. Validates the workflow exists and is executable
 * 2. Runs the workflow with the provided inputs including pre-retrieved alerts
 * 3. Polls for workflow completion
 * 4. Extracts and returns the generation results
 * 5. Writes event log events for monitoring
 */
export const invokeGenerationWorkflow = async ({
  alertRetrievalResult,
  alertsIndexPattern,
  apiConfig,
  authenticatedUser,
  end,
  eventLogger,
  eventLogIndex,
  executionUuid,
  filter,
  logger,
  maxWaitMs,
  request,
  size,
  source,
  sourceMetadata,
  spaceId,
  start,
  workflowId,
  workflowConfig,
  workflowsManagementApi,
}: InvokeGenerationWorkflowParams): Promise<GenerationWorkflowResult> => {
  const startTime = new Date();
  // Initialized with a fallback before the try block so the catch block can reference
  // the most-recent value (updated to the actual run ID once runWorkflow succeeds).
  let workflowRunId = `generation-${executionUuid}`;
  // Captured outside the try block so the catch block can reference it when writing
  // the generate-step-failed event after the workflow fails mid-execution.
  let generateStepStartTime: Date | undefined;

  logger.info(`Invoking generation workflow: ${workflowId}`);

  try {
    // Step 1: Get and validate the workflow
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
    const validatedWorkflow = validateWorkflow(rawWorkflow, workflowId);
    const workflowName = validatedWorkflow.name;

    // Step 2: Build workflow inputs
    const workflowInputs = buildWorkflowInputs({
      alertRetrievalResult,
      alertsIndexPattern,
      apiConfig,
      end,
      filter,
      logger,
      size,
      start,
      workflowConfig,
    });

    logger.debug(
      () =>
        `Generation workflow inputs: ${JSON.stringify({
          additionalAlertsCount: alertRetrievalResult.alerts.length,
          alertsIndexPattern,
          apiConfig: {
            action_type_id: apiConfig.action_type_id,
            connector_id: apiConfig.connector_id,
          },
          alertRetrievalMode: workflowConfig.alert_retrieval_mode,
          end,
          filter: filter ? 'present' : 'absent',
          size,
          start,
        })}`
    );

    // Step 3: Run the workflow
    const workflowToRun: WorkflowExecutionEngineModel = {
      definition: validatedWorkflow.definition,
      enabled: validatedWorkflow.enabled,
      id: validatedWorkflow.id,
      name: validatedWorkflow.name,
      yaml: validatedWorkflow.yaml,
    };

    workflowRunId = await workflowsManagementApi.runWorkflow(
      workflowToRun,
      spaceId,
      workflowInputs,
      request
    );

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval:
        alertRetrievalResult.workflowExecutions.length > 0
          ? alertRetrievalResult.workflowExecutions
          : null,
      generation: workflowExecution,
      validation: null,
    };

    logger.info(`Generation workflow started (workflowRunId: ${workflowRunId})`);

    // Write generate-step-started event (best-effort).
    // For 'provided' mode, include the alert strings so the pipeline_data route
    // can surface them during the running state (before step.input is populated).
    generateStepStartTime = new Date();
    await writeGenerateStepStartedEvent({
      alertsContextCount: alertRetrievalResult.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      ...(workflowConfig.alert_retrieval_mode === 'provided' &&
      alertRetrievalResult.alerts.length > 0
        ? { providedAlerts: alertRetrievalResult.alerts }
        : {}),
      source,
      spaceId,
      startTime: generateStepStartTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    // Step 4: Poll for completion
    const execution = await pollForWorkflowCompletion({
      executionId: workflowRunId,
      isReady: (exec) => exec.stepExecutions.some((step) => step.stepType === GENERATION_STEP_TYPE),
      logger,
      ...(maxWaitMs != null ? { maxWaitMs } : {}),
      spaceId,
      workflowsManagementApi,
    });

    if (execution.status === 'cancelled') {
      throw new AttackDiscoveryError({
        errorCategory: 'concurrent_conflict',
        message: `Generation workflow '${workflowName}' (id: ${workflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`,
        workflowId,
      });
    }

    if (execution.status === 'timed_out') {
      throw new AttackDiscoveryError({
        errorCategory: 'timeout',
        message: `Generation workflow '${workflowName}' (id: ${workflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`,
        workflowId,
      });
    }

    // Step 5: Extract results
    const result = extractGenerationWorkflowResult({ execution, executionUuid });
    const endTime = new Date();

    logger.info(
      `Generation workflow completed: ${result.attackDiscoveries.length} discoveries generated`
    );

    // Write generate-step-succeeded event (best-effort).
    // NOTE: newAlerts is intentionally omitted here. The discoveries count written
    // to the event log must reflect the PERSISTED count (after deduplication and
    // hallucination filtering), which is only known after validation. Writing the
    // raw generated count here would inflate the max() aggregation used by the UI.
    await writeGenerateStepSucceededEvent({
      alertsContextCount: result.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      spaceId,
      startTime: generateStepStartTime ?? startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    // Step 6: Write success event.
    // NOTE: newAlerts is intentionally omitted here. The discoveries count written
    // to the event log must reflect the PERSISTED count (after deduplication and
    // hallucination filtering), which is only known after validation. Writing the
    // raw generated count here would inflate the max() aggregation used by the UI.
    await writeGenerationSucceededEvent({
      alertsContextCount: result.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      sourceMetadata,
      spaceId,
      startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    return {
      alertsContextCount: result.alertsContextCount,
      attackDiscoveries: result.attackDiscoveries,
      executionUuid: result.executionUuid,
      replacements: result.replacements,
      workflowExecution,
      workflowId,
      workflowRunId,
    };
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Generation workflow failed: ${errorMessage}`);

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval:
        alertRetrievalResult.workflowExecutions.length > 0
          ? alertRetrievalResult.workflowExecutions
          : null,
      generation: workflowExecution,
      validation: null,
    };

    // Best-effort: generate-step failed
    // NOTE: generation-failed is intentionally NOT written here to avoid a
    // double-write. executeGenerationWorkflow's catch block is the sole owner
    // of the top-level generation-failed event. This function owns only the
    // generate-step-* sub-events and generation-succeeded.
    await writeGenerateStepFailedEvent({
      alertsContextCount: alertRetrievalResult.alertsContextCount,
      authenticatedUser,
      connectorId: apiConfig.connector_id,
      endTime,
      errorMessage,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      spaceId,
      startTime: generateStepStartTime ?? startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    // NOTE: The outer generation-failed event is written by
    // executeGenerationWorkflow's catch block, which has richer context
    // (errorCategory, failedWorkflowId). Do not write it here to avoid
    // duplicate events for the same executionUuid.

    throw error;
  }
};
