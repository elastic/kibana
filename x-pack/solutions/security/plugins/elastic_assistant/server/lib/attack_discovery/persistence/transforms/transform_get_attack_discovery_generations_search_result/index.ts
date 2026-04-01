/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';
import type {
  GetAttackDiscoveryGenerationsResponse,
  WorkflowExecutionReference,
  WorkflowExecutionsTracking,
} from '@kbn/elastic-assistant-common';

import { GetAttackDiscoveryGenerationsSearchResult } from '../../get_attack_discovery_generations_search_result';
import { getGenerationStatusOrThrow } from './get_generation_status_or_throw';

const STEP_COMPLETE_ACTION = 'step-complete';
const STEP_FAIL_ACTION = 'step-fail';
const STEP_START_ACTION = 'step-start';

/**
 * Maps actual event actions to step lifecycle categories.
 *
 * The event log writes specific action names like `alert-retrieval-started`,
 * `generate-step-started`, `validation-started`, etc. These need to be mapped
 * to the generic step lifecycle categories that the client expects.
 *
 * Events are counted **per step type** (alert retrieval, generation, validation)
 * so that multiple alert retrieval workflows don't cause double-counting that
 * would make the UI incorrectly show generation or validation as started/completed.
 */

/** Per-step event action mappings */
const ALERT_RETRIEVAL_STARTED_ACTIONS = ['alert-retrieval-started'];
const ALERT_RETRIEVAL_SUCCEEDED_ACTIONS = ['alert-retrieval-succeeded'];
const ALERT_RETRIEVAL_FAILED_ACTIONS = ['alert-retrieval-failed'];

const GENERATION_STARTED_ACTIONS = ['generate-step-started'];
const GENERATION_SUCCEEDED_ACTIONS = ['generate-step-succeeded'];
const GENERATION_FAILED_ACTIONS = ['generate-step-failed'];

/**
 * Validation step event actions. Includes both new (validation-*) and legacy
 * (promotion-*) names for backward compatibility with historical ES indices.
 */
const VALIDATION_STARTED_ACTIONS = ['validation-started', 'promotion-started'];
const VALIDATION_SUCCEEDED_ACTIONS = ['validation-succeeded', 'promotion-succeeded'];
const VALIDATION_FAILED_ACTIONS = ['validation-failed', 'promotion-failed'];

const getDocCountForActions = ({
  actions,
  buckets,
}: {
  actions: string[];
  buckets: Array<{ doc_count: number; key: string }>;
}): number =>
  actions.reduce((total, action) => {
    const bucket = buckets.find((b) => b.key === action);
    return total + (bucket?.doc_count ?? 0);
  }, 0);

interface StepCounts {
  failCount: number;
  startCount: number;
  successCount: number;
}

/**
 * Converts per-step event counts into a lifecycle action sequence for that step.
 * Multiple started/succeeded events for the same step (e.g. multiple alert retrieval
 * workflows) are collapsed into a single step lifecycle.
 */
const buildStepLifecycleActions = (counts: StepCounts): string[] => {
  const hasStarted = counts.startCount > 0;
  const hasSucceeded = counts.successCount > 0;
  const hasFailed = counts.failCount > 0;

  // If all workflows for this step succeeded (and at least one completed), mark step complete
  if (hasSucceeded && !hasFailed) {
    return [STEP_START_ACTION, STEP_COMPLETE_ACTION];
  }

  // If any workflow failed, mark step failed
  if (hasFailed) {
    return [STEP_START_ACTION, STEP_FAIL_ACTION];
  }

  // If workflows have started but none completed yet, mark step running
  if (hasStarted) {
    return [STEP_START_ACTION];
  }

  // No events for this step yet
  return [];
};

const getStepLifecycleEventActions = (
  eventActionBuckets: Array<{ doc_count: number; key: string }>
): string[] | undefined => {
  const alertRetrievalCounts: StepCounts = {
    failCount: getDocCountForActions({
      actions: ALERT_RETRIEVAL_FAILED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    startCount: getDocCountForActions({
      actions: ALERT_RETRIEVAL_STARTED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    successCount: getDocCountForActions({
      actions: ALERT_RETRIEVAL_SUCCEEDED_ACTIONS,
      buckets: eventActionBuckets,
    }),
  };

  const generationCounts: StepCounts = {
    failCount: getDocCountForActions({
      actions: GENERATION_FAILED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    startCount: getDocCountForActions({
      actions: GENERATION_STARTED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    successCount: getDocCountForActions({
      actions: GENERATION_SUCCEEDED_ACTIONS,
      buckets: eventActionBuckets,
    }),
  };

  const validationCounts: StepCounts = {
    failCount: getDocCountForActions({
      actions: VALIDATION_FAILED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    startCount: getDocCountForActions({
      actions: VALIDATION_STARTED_ACTIONS,
      buckets: eventActionBuckets,
    }),
    successCount: getDocCountForActions({
      actions: VALIDATION_SUCCEEDED_ACTIONS,
      buckets: eventActionBuckets,
    }),
  };

  const actions = [
    ...buildStepLifecycleActions(alertRetrievalCounts),
    ...buildStepLifecycleActions(generationCounts),
    ...buildStepLifecycleActions(validationCounts),
  ];

  return actions.length > 0 ? actions : undefined;
};

interface ParsedErrorClassification {
  errorCategory?: string;
  failedWorkflowId?: string;
}

/**
 * Parses errorCategory and failedWorkflowId from a parsed event.reference JSON object.
 * Returns null if neither field is present or the input is not a record (backward compat with old events).
 */
export const parseErrorClassification = (parsed: unknown): ParsedErrorClassification | null => {
  if (!isRecord(parsed)) {
    return null;
  }

  const { errorCategory, failedWorkflowId } = parsed;

  if (typeof errorCategory !== 'string' && typeof failedWorkflowId !== 'string') {
    return null;
  }

  return {
    ...(typeof errorCategory === 'string' ? { errorCategory } : {}),
    ...(typeof failedWorkflowId === 'string' ? { failedWorkflowId } : {}),
  };
};

interface ParsedValidationSummary {
  duplicatesDroppedCount?: number;
  generatedCount: number;
  hallucinationsFilteredCount?: number;
  persistedCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

/**
 * Parses validationSummary from a parsed event.reference JSON object.
 * Returns null if the summary is absent or invalid (backward compat with old events).
 */
export const parseValidationSummary = (parsed: unknown): ParsedValidationSummary | null => {
  if (!isRecord(parsed)) {
    return null;
  }

  const summary = parsed.validationSummary;

  if (!isRecord(summary)) {
    return null;
  }

  const { generatedCount, persistedCount, duplicatesDroppedCount, hallucinationsFilteredCount } =
    summary;

  if (typeof generatedCount !== 'number' || typeof persistedCount !== 'number') {
    return null;
  }

  return {
    generatedCount,
    persistedCount,
    ...(typeof duplicatesDroppedCount === 'number' ? { duplicatesDroppedCount } : {}),
    ...(typeof hallucinationsFilteredCount === 'number' ? { hallucinationsFilteredCount } : {}),
  };
};

const parseWorkflowExecutionReference = (value: unknown): WorkflowExecutionReference | null => {
  if (!isRecord(value)) {
    return null;
  }

  const workflowId = value.workflowId;
  const workflowRunId = value.workflowRunId;

  if (typeof workflowId !== 'string' || typeof workflowRunId !== 'string') {
    return null;
  }

  return {
    workflowId,
    workflowRunId,
  };
};

/**
 * Parses alertRetrieval from the event.reference JSON.
 * Supports both the new array format and the legacy single-reference format.
 */
const parseAlertRetrievalReferences = (value: unknown): WorkflowExecutionReference[] | null => {
  if (value == null) {
    return null;
  }

  // New format: alertRetrieval is an array
  if (Array.isArray(value)) {
    const refs = value
      .map((item) => parseWorkflowExecutionReference(item))
      .filter((ref): ref is WorkflowExecutionReference => ref != null);

    return refs.length > 0 ? refs : null;
  }

  // Legacy format: alertRetrieval is a single reference
  const singleRef = parseWorkflowExecutionReference(value);

  return singleRef != null ? [singleRef] : null;
};

const parseWorkflowExecutionsTracking = (
  value: unknown
): WorkflowExecutionsTracking | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const alertRetrieval = parseAlertRetrievalReferences(value.alertRetrieval);
  // Support both new (generation) and legacy (orchestrator) keys for backward compatibility
  const generation =
    parseWorkflowExecutionReference(value.generation) ??
    parseWorkflowExecutionReference(value.orchestrator);
  // Support both new (validation) and legacy (promotion) keys for backward compatibility
  const validation = parseWorkflowExecutionReference(value.validation ?? value.promotion);

  if (alertRetrieval == null && generation == null && validation == null) {
    return undefined;
  }

  return {
    alertRetrieval,
    generation,
    validation,
  };
};

/**
 * Checks if a workflow execution reference has a real (non-stub) workflow run ID.
 */
const isRealWorkflowExecution = (ref: WorkflowExecutionReference | null): boolean =>
  ref != null && !ref.workflowRunId.startsWith('stub-');

/**
 * Checks if any reference in an array of alert retrieval executions is real (non-stub).
 */
const hasRealAlertRetrievalExecution = (
  refs: WorkflowExecutionReference[] | null | undefined
): boolean => refs != null && refs.some((ref) => !ref.workflowRunId.startsWith('stub-'));

/**
 * Merges alert retrieval reference arrays, deduplicating by workflowRunId
 * and preferring real IDs over stubs.
 */
const mergeAlertRetrievalReferences = (
  existing: WorkflowExecutionReference[] | null | undefined,
  incoming: WorkflowExecutionReference[] | null | undefined
): WorkflowExecutionReference[] | null => {
  if (incoming == null) {
    return existing ?? null;
  }

  if (existing == null) {
    return incoming ?? null;
  }

  const seenRunIds = new Set<string>();
  const merged: WorkflowExecutionReference[] = [];

  // Add all existing references first
  for (const ref of existing) {
    if (!seenRunIds.has(ref.workflowRunId)) {
      seenRunIds.add(ref.workflowRunId);
      merged.push(ref);
    }
  }

  // Add incoming references that aren't duplicates
  for (const ref of incoming) {
    if (!seenRunIds.has(ref.workflowRunId)) {
      seenRunIds.add(ref.workflowRunId);
      merged.push(ref);
    }
  }

  return merged.length > 0 ? merged : null;
};

/**
 * Merges all workflow_reference buckets from the aggregation to build the most
 * complete WorkflowExecutionsTracking. Prefers real (non-stub) IDs over stub IDs.
 *
 * This is necessary because each event in a generation writes its own partial
 * workflowExecutions to event.reference (only what's known at that point).
 * The terms aggregation returns multiple buckets, and we need to merge them
 * to get the complete picture.
 */
const mergeWorkflowExecutionsFromReferenceBuckets = ({
  executionUuid,
  logger,
  workflowReferenceBuckets,
}: {
  executionUuid: string;
  logger: Logger;
  workflowReferenceBuckets: Array<{ key: string }> | undefined;
}): WorkflowExecutionsTracking | undefined => {
  if (!workflowReferenceBuckets || workflowReferenceBuckets.length === 0) {
    return undefined;
  }

  const merged: WorkflowExecutionsTracking = {
    alertRetrieval: null,
    generation: null,
    validation: null,
  };

  let hasAnyData = false;

  for (const bucket of workflowReferenceBuckets) {
    try {
      const parsed = JSON.parse(bucket.key) as unknown;
      const tracking = parseWorkflowExecutionsTracking(parsed);

      if (tracking) {
        // Merge alert retrieval arrays: prefer real IDs, accumulate all references
        if (tracking.alertRetrieval != null) {
          if (
            merged.alertRetrieval == null ||
            (!hasRealAlertRetrievalExecution(merged.alertRetrieval) &&
              hasRealAlertRetrievalExecution(tracking.alertRetrieval))
          ) {
            // Replace stub-only merged data with incoming that has real IDs
            merged.alertRetrieval = mergeAlertRetrievalReferences(
              hasRealAlertRetrievalExecution(merged.alertRetrieval) ? merged.alertRetrieval : null,
              tracking.alertRetrieval
            );
          } else {
            // Both have real IDs or incoming is stub-only: merge arrays
            merged.alertRetrieval = mergeAlertRetrievalReferences(
              merged.alertRetrieval,
              tracking.alertRetrieval
            );
          }
          hasAnyData = true;
        }

        if (
          tracking.generation &&
          (merged.generation == null || isRealWorkflowExecution(tracking.generation))
        ) {
          merged.generation = tracking.generation;
          hasAnyData = true;
        }

        if (
          tracking.validation &&
          (merged.validation == null || isRealWorkflowExecution(tracking.validation))
        ) {
          merged.validation = tracking.validation;
          hasAnyData = true;
        }
      }
    } catch (error) {
      logger.debug(
        `Failed to parse workflow reference bucket for executionUuid ${executionUuid}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return hasAnyData ? merged : undefined;
};

/**
 * Extracts the validationSummary from event.reference buckets, returning the last non-null
 * value found. The validation-succeeded event is the only event that writes validationSummary,
 * so typically only one bucket will contain it.
 */
const parseValidationSummaryFromReferenceBuckets = ({
  executionUuid,
  logger,
  workflowReferenceBuckets,
}: {
  executionUuid: string;
  logger: Logger;
  workflowReferenceBuckets: Array<{ key: string }> | undefined;
}): ParsedValidationSummary | undefined => {
  if (!workflowReferenceBuckets || workflowReferenceBuckets.length === 0) {
    return undefined;
  }

  let lastFound: ParsedValidationSummary | null = null;

  for (const bucket of workflowReferenceBuckets) {
    try {
      const parsed = JSON.parse(bucket.key) as unknown;
      const summary = parseValidationSummary(parsed);
      if (summary != null) {
        lastFound = summary;
      }
    } catch (error) {
      logger.debug(
        () =>
          `Failed to parse validation summary bucket for executionUuid ${executionUuid}: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    }
  }

  return lastFound ?? undefined;
};

/**
 * Extracts error classification fields from event.reference buckets, returning the last non-null
 * value found. The step-fail event is the only event that writes errorCategory/failedWorkflowId,
 * so typically only one bucket will contain them.
 */
const parseErrorClassificationFromReferenceBuckets = ({
  executionUuid,
  logger,
  workflowReferenceBuckets,
}: {
  executionUuid: string;
  logger: Logger;
  workflowReferenceBuckets: Array<{ key: string }> | undefined;
}): ParsedErrorClassification | undefined => {
  if (!workflowReferenceBuckets || workflowReferenceBuckets.length === 0) {
    return undefined;
  }

  let lastFound: ParsedErrorClassification | null = null;

  for (const bucket of workflowReferenceBuckets) {
    try {
      const parsed = JSON.parse(bucket.key) as unknown;
      const classification = parseErrorClassification(parsed);
      if (classification != null) {
        lastFound = classification;
      }
    } catch (error) {
      logger.debug(
        () =>
          `Failed to parse error classification bucket for executionUuid ${executionUuid}: ${
            error instanceof Error ? error.message : String(error)
          }`
      );
    }
  }

  return lastFound ?? undefined;
};

export const transformGetAttackDiscoveryGenerationsSearchResult = ({
  logger,
  rawResponse,
}: {
  rawResponse: {
    aggregations: AggregationsAggregate | undefined;
  };
  logger: Logger;
}): GetAttackDiscoveryGenerationsResponse => {
  try {
    // validate the raw response:
    const parsed = GetAttackDiscoveryGenerationsSearchResult.parse(rawResponse);

    logger.debug(
      () => `Parsed ${parsed.aggregations.generations.buckets.length} generation buckets`
    );

    // generate the response, skipping any generations that are missing required fields
    const generations = parsed.aggregations.generations.buckets.flatMap((bucket) => {
      const executionUuid: string | undefined = bucket.key;

      try {
        if (executionUuid == null) {
          throw new Error(
            `Execution UUID (kibana.alert.rule.execution.uuid) is missing for bucket ${JSON.stringify(
              bucket
            )}`
          );
        }

        const alertsContextCount = bucket.alerts_context_count.value ?? undefined;
        const connectorId: string | undefined = bucket.connector_id.buckets[0]?.key;
        const discoveries = bucket.discoveries.value ?? 0;
        const eventActions: string[] = bucket.event_actions.buckets.map((action) => action.key);
        const stepEventActions = getStepLifecycleEventActions(bucket.event_actions.buckets);
        const eventReason: string | undefined = bucket.event_reason.buckets[0]?.key;
        const generationEndTime = bucket.generation_end_time?.value_as_string ?? undefined;
        const generationStartTime = bucket.generation_start_time?.value_as_string;
        const loadingMessage: string | undefined = bucket.loading_message.buckets[0]?.key;
        const status = getGenerationStatusOrThrow({ eventActions, executionUuid });

        /**
         * Workflow tracking
         *
         * - workflow_id: derived from `event.module` (workflow definition ID)
         * - workflow_run_id: derived from `event.id` (workflow run ID)
         * - workflow_executions: derived from `event.reference` (JSON)
         *
         * NOTE: Legacy `event.reference` colon-separated values are ignored.
         *
         * @see get_attack_discovery_generations_aggs/index.ts for aggregation
         */
        const workflowId: string | undefined = bucket.workflow_id?.buckets[0]?.key;
        const workflowRunId: string | undefined = bucket.workflow_run_id?.buckets[0]?.key;
        const workflowExecutions = mergeWorkflowExecutionsFromReferenceBuckets({
          executionUuid,
          logger,
          workflowReferenceBuckets: bucket.workflow_reference?.buckets,
        });
        const validationSummary = parseValidationSummaryFromReferenceBuckets({
          executionUuid,
          logger,
          workflowReferenceBuckets: bucket.workflow_reference?.buckets,
        });
        const errorClassification = parseErrorClassificationFromReferenceBuckets({
          executionUuid,
          logger,
          workflowReferenceBuckets: bucket.workflow_reference?.buckets,
        });

        if (connectorId == null) {
          throw new Error(
            `Connector ID (event.dataset) is missing for executionUuid ${executionUuid}`
          );
        }

        if (generationStartTime == null) {
          throw new Error(
            `Generation start (event.start) time is missing for executionUuid ${executionUuid}`
          );
        }

        if (loadingMessage == null) {
          throw new Error(
            `Loading message (kibana.alert.rule.execution.status) is missing for executionUuid ${executionUuid}`
          );
        }

        return {
          alerts_context_count: alertsContextCount,
          connector_id: connectorId,
          discoveries,
          ...(errorClassification?.errorCategory != null
            ? { error_category: errorClassification.errorCategory }
            : {}),
          ...(validationSummary?.duplicatesDroppedCount != null
            ? { duplicates_dropped_count: validationSummary.duplicatesDroppedCount }
            : {}),
          end: generationEndTime,
          execution_uuid: executionUuid,
          ...(errorClassification?.failedWorkflowId != null
            ? { failed_workflow_id: errorClassification.failedWorkflowId }
            : {}),
          ...(validationSummary?.generatedCount != null
            ? { generated_count: validationSummary.generatedCount }
            : {}),
          generation_start_time: generationStartTime,
          ...(validationSummary?.hallucinationsFilteredCount != null
            ? { hallucinations_filtered_count: validationSummary.hallucinationsFilteredCount }
            : {}),
          loading_message: loadingMessage,
          ...(validationSummary?.persistedCount != null
            ? { persisted_count: validationSummary.persistedCount }
            : {}),
          reason: eventReason,
          start: generationStartTime,
          status,
          ...(stepEventActions != null ? { step_event_actions: stepEventActions } : {}),
          ...(workflowExecutions != null ? { workflow_executions: workflowExecutions } : {}),
          workflow_id: workflowId,
          workflow_run_id: workflowRunId,
        };
      } catch (e) {
        logger.debug(
          () =>
            `Skipping Attack discovery generation search result for execution ${
              executionUuid != null ? executionUuid : 'unknown executionUuid'
            }: ${e.message}`
        );
        return [];
      }
    });

    return {
      generations,
    };
  } catch (e) {
    const errorMessage = `Failed to parse search results in transformGetAttackDiscoveryGenerationsSearchResult ${JSON.stringify(
      e.errors,
      null,
      2
    )}`;

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
};
