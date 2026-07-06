/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
  type AttackDiscoverySource,
  type ValidationSummary,
  writeAttackDiscoveryEvent,
} from '../persistence/event_logging';
import { getDurationNanoseconds } from '../../lib/persistence';

import { AttackDiscoveryError } from '../../lib/errors/attack_discovery_error';

import { deduplicateScheduledDiscoveries } from './deduplicate_scheduled_discoveries';
import type {
  AlertRetrievalResult,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';
import type { GenerationWorkflowResult } from './invoke_generation_workflow';
import { pollForWorkflowCompletion } from './poll_for_workflow_completion';
import type {
  WorkflowConfig,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from './types';

/**
 * Result returned from the validation workflow.
 */
export interface ValidationResult {
  /**
   * The discoveries the persist step was handed (its `discoveries_to_persist`
   * output). Defaults to `[]` when the persist step did not run. Scheduled rules
   * report this handover; ad-hoc and the run step own their own I/O via the step.
   */
  discoveriesToPersist?: unknown[];
  duplicatesDroppedCount?: number;
  generatedCount: number;
  success: boolean;
  validatedDiscoveries?: unknown[];
  validationSummary: ValidationSummary;
  workflowExecution?: WorkflowExecutionTracking;
  workflowId: string;
  workflowRunId: string;
}

type ExtractedValidationResult = Omit<
  ValidationResult,
  'duplicatesDroppedCount' | 'workflowExecution' | 'workflowId' | 'workflowRunId'
> & { duplicatesDroppedCount?: number };

/**
 * Parameters for invoking the validation workflow.
 */
export interface InvokeValidationParams {
  alertRetrievalResult: AlertRetrievalResult;
  authenticatedUser: AuthenticatedUser;
  /**
   * Isomorphic sha256 hasher injected by the scheduled executor for FF-on
   * scheduled cross-execution de-duplication (this package cannot import the
   * Node.js `crypto` builtin). Present only on the scheduled path.
   */
  computeSha256Hash?: (input: string) => string;
  defaultValidationWorkflowId: string;
  enableFieldRendering: boolean;
  /**
   * Trusted in-process Elasticsearch client used for FF-on scheduled
   * cross-execution de-duplication. Present only on the scheduled path.
   */
  esClient?: ElasticsearchClient;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  logger: Logger;
  generationResult: GenerationWorkflowResult;
  maxWaitMs?: number;
  request: KibanaRequest;
  /**
   * Trusted in-process schedule owner (the alerting `rule.id`) used as the alert
   * hash owner for FF-on scheduled cross-execution de-duplication.
   */
  ruleId?: string;
  source?: AttackDiscoverySource;
  spaceId: string;
  withReplacements: boolean;
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
      message: `Validation workflow (id: ${workflowId}) not found. It may have been deleted. Reconfigure the validation workflow in Attack Discovery settings.`,
      workflowId,
    });
  }

  if (!workflow.definition) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Validation workflow '${workflow.name}' (id: ${workflowId}) is missing a definition. Edit the workflow YAML to add a valid definition.`,
      workflowId,
    });
  }

  if (!workflow.valid) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_invalid',
      message: `Validation workflow '${workflow.name}' (id: ${workflowId}) is not valid. The workflow YAML contains errors. Edit the workflow to fix configuration issues.`,
      workflowId,
    });
  }

  if (!workflow.enabled) {
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_disabled',
      message: `Validation workflow '${workflow.name}' (id: ${workflowId}) is not enabled. Enable it in the Workflows UI to resume generation.`,
      workflowId,
    });
  }

  return workflow as ValidatedWorkflow;
};

/**
 * Determines which validation workflow ID to use.
 * Uses the default if 'default' or empty string is specified.
 */
const getValidationWorkflowId = ({
  defaultValidationWorkflowId,
  workflowConfig,
}: {
  defaultValidationWorkflowId: string;
  workflowConfig: WorkflowConfig;
}): string => {
  const { validation_workflow_id: configuredId } = workflowConfig;

  return configuredId === '' || configuredId === 'default'
    ? defaultValidationWorkflowId
    : configuredId;
};

/**
 * Builds the workflow inputs from the provided parameters.
 */
const buildWorkflowInputs = ({
  alertRetrievalResult,
  enableFieldRendering,
  generationResult,
  source,
  withReplacements,
}: {
  alertRetrievalResult: AlertRetrievalResult;
  enableFieldRendering: boolean;
  generationResult: GenerationWorkflowResult;
  source?: AttackDiscoverySource;
  withReplacements: boolean;
}): Record<string, unknown> => ({
  alerts_context_count: alertRetrievalResult.alertsContextCount,
  anonymized_alerts: alertRetrievalResult.anonymizedAlerts,
  api_config: {
    action_type_id: alertRetrievalResult.apiConfig.action_type_id,
    connector_id: alertRetrievalResult.apiConfig.connector_id,
    model: alertRetrievalResult.apiConfig.model,
  },
  attack_discoveries: generationResult.attackDiscoveries,
  connector_name: alertRetrievalResult.connectorName,
  enable_field_rendering: enableFieldRendering,
  generation_uuid: generationResult.executionUuid,
  replacements: generationResult.replacements,
  source,
  with_replacements: withReplacements,
});

const VALIDATION_STEP_TYPE = 'security.attack-discovery.defaultValidation';
const PERSIST_STEP_TYPE = 'security.attack-discovery.persistDiscoveries';

/**
 * Extracts validated_discoveries from workflow outputs or step output.
 *
 * Prefers workflow-level context (works for custom workflows that declare
 * outputs). Falls back to searching by hardcoded step type for the default
 * validation workflow.
 */
const extractValidatedDiscoveries = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): unknown[] | undefined => {
  const context = execution.context as { validated_discoveries?: unknown } | undefined;

  if (Array.isArray(context?.validated_discoveries)) {
    return context.validated_discoveries;
  }

  const validationStep = execution.stepExecutions.find(
    (step) => step.stepType === VALIDATION_STEP_TYPE
  );

  if (validationStep?.output == null) {
    return undefined;
  }

  const output = validationStep.output as { validated_discoveries?: unknown };

  if (!Array.isArray(output.validated_discoveries)) {
    return undefined;
  }

  return output.validated_discoveries;
};

/**
 * Extracts duplicates_dropped_count from the persist step output or workflow context.
 */
const extractDuplicatesDroppedCount = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): number | undefined => {
  const context = execution.context as { duplicates_dropped_count?: unknown } | undefined;

  if (typeof context?.duplicates_dropped_count === 'number') {
    return context.duplicates_dropped_count;
  }

  const persistStep = execution.stepExecutions.find((step) => step.stepType === PERSIST_STEP_TYPE);

  if (persistStep?.output == null) {
    return undefined;
  }

  const output = persistStep.output as { duplicates_dropped_count?: unknown };

  if (typeof output.duplicates_dropped_count === 'number') {
    return output.duplicates_dropped_count;
  }

  return undefined;
};

/**
 * Extracts hallucinations_filtered_count from the defaultValidation step output or workflow context.
 */
const extractHallucinationsFilteredCount = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): number | undefined => {
  const context = execution.context as { filtered_count?: unknown } | undefined;

  if (typeof context?.filtered_count === 'number') {
    return context.filtered_count;
  }

  const validationStep = execution.stepExecutions.find(
    (step) => step.stepType === VALIDATION_STEP_TYPE
  );

  if (validationStep?.output == null) {
    return undefined;
  }

  const output = validationStep.output as { filtered_count?: unknown };

  if (typeof output.filtered_count === 'number') {
    return output.filtered_count;
  }

  return undefined;
};

/**
 * Extracts filter_reason from the defaultValidation step output or workflow context.
 */
const extractFilterReason = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): string | undefined => {
  const context = execution.context as { filter_reason?: unknown } | undefined;

  if (typeof context?.filter_reason === 'string') {
    return context.filter_reason;
  }

  const validationStep = execution.stepExecutions.find(
    (step) => step.stepType === VALIDATION_STEP_TYPE
  );

  if (validationStep?.output == null) {
    return undefined;
  }

  const output = validationStep.output as { filter_reason?: unknown };

  if (typeof output.filter_reason === 'string') {
    return output.filter_reason;
  }

  return undefined;
};

/**
 * Extracts persisted_discoveries from the persist step output or workflow context.
 */
const extractPersistedDiscoveries = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): unknown[] | undefined => {
  const context = execution.context as { persisted_discoveries?: unknown } | undefined;

  if (Array.isArray(context?.persisted_discoveries)) {
    return context.persisted_discoveries;
  }

  const persistStep = execution.stepExecutions.find((step) => step.stepType === PERSIST_STEP_TYPE);

  if (persistStep?.output == null) {
    return undefined;
  }

  const output = persistStep.output as { persisted_discoveries?: unknown };

  if (Array.isArray(output.persisted_discoveries)) {
    return output.persisted_discoveries;
  }

  return undefined;
};

/**
 * Extracts discoveries_to_persist (the persist step handover) from the persist
 * step output or workflow context. This is the echo of the discoveries handed to
 * the persist step for ALL sources; scheduled rules report exactly this handover.
 */
const extractDiscoveriesToPersist = ({
  execution,
}: {
  execution: WorkflowExecutionDto;
}): unknown[] | undefined => {
  const context = execution.context as { discoveries_to_persist?: unknown } | undefined;

  if (Array.isArray(context?.discoveries_to_persist)) {
    return context.discoveries_to_persist;
  }

  const persistStep = execution.stepExecutions.find((step) => step.stepType === PERSIST_STEP_TYPE);

  if (persistStep?.output == null) {
    return undefined;
  }

  const output = persistStep.output as { discoveries_to_persist?: unknown };

  if (Array.isArray(output.discoveries_to_persist)) {
    return output.discoveries_to_persist;
  }

  return undefined;
};

/**
 * Whether the validation workflow invoked the persist step. R1: validation
 * workflows MUST call the persist step, otherwise nothing is persisted.
 */
const hasPersistStep = ({ execution }: { execution: WorkflowExecutionDto }): boolean =>
  execution.stepExecutions.some((step) => step.stepType === PERSIST_STEP_TYPE);

/**
 * Extracts the validation result from the workflow execution.
 */
const extractValidationResult = ({
  generatedCount,
  execution,
  logger,
}: {
  generatedCount: number;
  execution: WorkflowExecutionDto;
  logger: Logger;
}): ExtractedValidationResult => {
  if (execution.status === 'failed') {
    const errorMessage = execution.error?.message ?? 'Unknown error';
    throw new AttackDiscoveryError({
      errorCategory: 'workflow_error',
      message: `Validation workflow failed: ${errorMessage}`,
      workflowId: execution.workflowId,
    });
  }

  const persistStepInvoked = hasPersistStep({ execution });

  if (!persistStepInvoked) {
    // R1: a validation workflow that does not invoke the persist step persists
    // nothing (noop). Surface this so misconfigured custom workflows are visible.
    logger.warn(
      `Validation workflow '${execution.workflowId}' (run: ${execution.id}) completed but did not invoke the persist step; nothing was persisted.`
    );
  }

  const discoveriesToPersist = extractDiscoveriesToPersist({ execution }) ?? [];
  const duplicatesDroppedCount = extractDuplicatesDroppedCount({ execution });
  const filterReason = extractFilterReason({ execution });
  const hallucinationsFilteredCount = extractHallucinationsFilteredCount({ execution });
  const persistedDiscoveries = extractPersistedDiscoveries({ execution });
  // persistedCount prefers the ad-hoc persistence result: persisted_discoveries
  // already contains ONLY the net-new discoveries created this run (duplicates are
  // dropped on write), so its length is the new count directly. When ad-hoc
  // persistence wrote nothing (scheduled), we report the handover
  // (discoveries_to_persist) length. When there is no persist output at all but the
  // persist step ran, we fall back to generatedCount minus both counters. When the
  // persist step never ran (R1 noop) and there is no evidence of persistence,
  // persistedCount is 0 — reporting generatedCount would be misleading.
  const persistedCount =
    persistedDiscoveries != null && persistedDiscoveries.length > 0
      ? persistedDiscoveries.length
      : discoveriesToPersist.length > 0
      ? discoveriesToPersist.length
      : persistedDiscoveries != null
      ? persistedDiscoveries.length
      : !persistStepInvoked
      ? 0
      : Math.max(
          0,
          generatedCount - (duplicatesDroppedCount ?? 0) - (hallucinationsFilteredCount ?? 0)
        );

  const validationSummary: ValidationSummary = {
    ...(duplicatesDroppedCount != null ? { duplicatesDroppedCount } : {}),
    ...(filterReason != null ? { filterReason } : {}),
    generatedCount,
    ...(hallucinationsFilteredCount != null ? { hallucinationsFilteredCount } : {}),
    persistedCount,
  };

  return {
    discoveriesToPersist,
    duplicatesDroppedCount,
    generatedCount,
    success: execution.status === 'completed',
    validatedDiscoveries: extractValidatedDiscoveries({ execution }),
    validationSummary,
  };
};

/**
 * FF-on scheduled cross-execution de-duplication (Option B).
 *
 * The persist step short-circuits for scheduled rules (it reports the handover
 * with `duplicates_dropped_count: 0`), so search-based dedup must run here —
 * where the `validation-succeeded` summary is written — using the trusted
 * in-process `rule.id`. Otherwise re-running a schedule re-persists attacks that
 * are already stored, and the reported counts drift from what is actually
 * persisted. Drops the already-persisted discoveries, then recomputes
 * `duplicatesDroppedCount` (dropped this run) and `persistedCount` (survivors)
 * and overrides the `validationSummary` so the event/EBT/History UI are accurate.
 */
const deduplicateScheduledResult = async ({
  alertRetrievalResult,
  computeSha256Hash,
  esClient,
  extractedResult,
  generationResult,
  logger,
  ruleId,
  spaceId,
}: {
  alertRetrievalResult: AlertRetrievalResult;
  computeSha256Hash: (input: string) => string;
  esClient: ElasticsearchClient;
  extractedResult: ExtractedValidationResult;
  generationResult: GenerationWorkflowResult;
  logger: Logger;
  ruleId: string;
  spaceId: string;
}): Promise<ExtractedValidationResult> => {
  const originalDiscoveries = extractedResult.discoveriesToPersist ?? [];

  const discoveriesToPersist = await deduplicateScheduledDiscoveries({
    computeSha256Hash,
    connectorId: alertRetrievalResult.apiConfig.connector_id,
    discoveriesToPersist: originalDiscoveries,
    esClient,
    logger,
    replacements: generationResult.replacements,
    ruleId,
    spaceId,
  });

  const duplicatesDroppedCount = originalDiscoveries.length - discoveriesToPersist.length;
  const persistedCount = discoveriesToPersist.length;

  return {
    ...extractedResult,
    discoveriesToPersist,
    duplicatesDroppedCount,
    validationSummary: {
      ...extractedResult.validationSummary,
      duplicatesDroppedCount,
      persistedCount,
    },
  };
};

/**
 * Writes the validation started event to the event log.
 */
const writeValidationStartedEvent = async ({
  authenticatedUser,
  connectorId,
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
  authenticatedUser: AuthenticatedUser;
  connectorId: string;
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
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery validation ${executionUuid} started`,
      source,
      spaceId,
      start: startTime,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write validation-started event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Writes the validation succeeded event to the event log.
 */
const writeValidationSucceededEvent = async ({
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
  validationSummary,
  workflowId,
  workflowExecutions,
  workflowRunId,
}: {
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
  validationSummary: ValidationSummary;
  workflowId: string;
  workflowExecutions: WorkflowExecutionsTracking;
  workflowRunId: string;
}): Promise<void> => {
  try {
    await writeAttackDiscoveryEvent({
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery validation ${executionUuid} succeeded: ${validationSummary.persistedCount} discoveries stored`,
      newAlerts: validationSummary.persistedCount,
      outcome: 'success',
      source,
      spaceId,
      validationSummary,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });
  } catch (error) {
    logger.error(
      `Failed to write validation-succeeded event: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Writes the validation failed event to the event log.
 */
const writeValidationFailedEvent = async ({
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
      action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED,
      authenticatedUser,
      connectorId,
      dataClient: null,
      duration: getDurationNanoseconds({ end: endTime, start: startTime }),
      end: endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      message: `Attack discovery validation ${executionUuid} failed`,
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
      `Failed to write validation-failed event: ${
        loggingError instanceof Error ? loggingError.message : String(loggingError)
      }`
    );
  }
};

/**
 * Invokes the validation workflow to store discoveries in Elasticsearch.
 * Uses the default validation workflow unless a custom one is specified.
 *
 * The function:
 * 1. Determines the validation workflow ID (default or custom)
 * 2. Validates the workflow exists and is executable
 * 3. Runs the workflow with the provided inputs
 * 4. Polls for workflow completion
 * 5. Extracts and returns the validation results
 * 6. Writes event log events for monitoring
 */
export const invokeValidationWorkflow = async ({
  alertRetrievalResult,
  authenticatedUser,
  computeSha256Hash,
  defaultValidationWorkflowId,
  enableFieldRendering,
  esClient,
  eventLogger,
  eventLogIndex,
  executionUuid,
  logger,
  generationResult,
  maxWaitMs,
  request,
  ruleId,
  source,
  spaceId,
  withReplacements,
  workflowConfig,
  workflowsManagementApi,
}: InvokeValidationParams): Promise<ValidationResult> => {
  const workflowId = getValidationWorkflowId({ defaultValidationWorkflowId, workflowConfig });
  const startTime = new Date();
  // Initialized with a fallback before the try block so the catch block can reference
  // the most-recent value (updated to the actual run ID once runWorkflow succeeds).
  let workflowRunId = `validation-${executionUuid}`;
  const generatedCount = generationResult.attackDiscoveries.length;
  // Captured outside the try block so the catch block can include the human-readable
  // workflow name in the failure tracker entry (falls back to undefined pre-validation).
  let workflowName: string | undefined;

  logger.info(`Invoking validation workflow: ${workflowId}`);

  try {
    // Step 1: Get and validate the workflow
    const rawWorkflow = await workflowsManagementApi.getWorkflow(workflowId, spaceId);
    const validatedWorkflow = validateWorkflow(rawWorkflow, workflowId);
    workflowName = validatedWorkflow.name;

    // Step 2: Build workflow inputs
    const workflowInputs = buildWorkflowInputs({
      alertRetrievalResult,
      enableFieldRendering,
      generationResult,
      source,
      withReplacements,
    });

    logger.debug(
      () =>
        `Validation workflow inputs: ${JSON.stringify({
          alertsContextCount: alertRetrievalResult.alertsContextCount,
          connectorName: alertRetrievalResult.connectorName,
          enableFieldRendering,
          generatedCount,
          withReplacements,
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
      ...(workflowName != null ? { workflowName } : {}),
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval:
        alertRetrievalResult.workflowExecutions.length > 0
          ? alertRetrievalResult.workflowExecutions
          : null,
      generation: generationResult.workflowExecution ?? null,
      validation: workflowExecution,
    };

    logger.info(`Validation workflow started (workflowRunId: ${workflowRunId})`);

    // Step 4: Write started event
    await writeValidationStartedEvent({
      authenticatedUser,
      connectorId: alertRetrievalResult.apiConfig.connector_id,
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
    });

    // Step 5: Poll for completion
    const execution = await pollForWorkflowCompletion({
      executionId: workflowRunId,
      isReady: (exec) => exec.stepExecutions.length > 0,
      logger,
      ...(maxWaitMs != null ? { maxWaitMs } : {}),
      spaceId,
      workflowsManagementApi,
    });

    if (execution.status === 'cancelled') {
      throw new AttackDiscoveryError({
        errorCategory: 'concurrent_conflict',
        message: `Validation workflow '${workflowName}' (id: ${workflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`,
        workflowId,
      });
    }

    if (execution.status === 'timed_out') {
      throw new AttackDiscoveryError({
        errorCategory: 'timeout',
        message: `Validation workflow '${workflowName}' (id: ${workflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`,
        workflowId,
      });
    }

    // Step 6: Extract results
    const extractedResult = extractValidationResult({ generatedCount, execution, logger });

    // Step 6b: FF-on scheduled cross-execution de-duplication. Gated strictly to
    // scheduled runs with the trusted in-process rule.id + esClient in scope;
    // ad-hoc / skill / run-step paths are untouched.
    const finalResult =
      source === 'scheduled' && computeSha256Hash != null && esClient != null && ruleId != null
        ? await deduplicateScheduledResult({
            alertRetrievalResult,
            computeSha256Hash,
            esClient,
            extractedResult,
            generationResult,
            logger,
            ruleId,
            spaceId,
          })
        : extractedResult;

    const endTime = new Date();

    logger.info(
      `Validation workflow completed: ${finalResult.validationSummary.persistedCount} discoveries stored`
    );

    // Step 7: Write success event
    await writeValidationSucceededEvent({
      authenticatedUser,
      connectorId: alertRetrievalResult.apiConfig.connector_id,
      endTime,
      eventLogger,
      eventLogIndex,
      executionUuid,
      logger,
      source,
      spaceId,
      startTime,
      validationSummary: finalResult.validationSummary,
      workflowId,
      workflowExecutions,
      workflowRunId,
    });

    return {
      discoveriesToPersist: finalResult.discoveriesToPersist,
      duplicatesDroppedCount: finalResult.duplicatesDroppedCount,
      generatedCount: finalResult.generatedCount,
      success: finalResult.success,
      validatedDiscoveries: finalResult.validatedDiscoveries,
      validationSummary: finalResult.validationSummary,
      workflowExecution,
      workflowId,
      workflowRunId,
    };
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Validation workflow failed: ${errorMessage}`);

    const workflowExecution: WorkflowExecutionTracking = {
      workflowId,
      ...(workflowName != null ? { workflowName } : {}),
      workflowRunId,
    };

    const workflowExecutions: WorkflowExecutionsTracking = {
      alertRetrieval:
        alertRetrievalResult.workflowExecutions.length > 0
          ? alertRetrievalResult.workflowExecutions
          : null,
      generation: generationResult.workflowExecution ?? null,
      validation: workflowExecution,
    };

    // Write failure event
    await writeValidationFailedEvent({
      authenticatedUser,
      connectorId: alertRetrievalResult.apiConfig.connector_id,
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
    });

    throw error;
  }
};
