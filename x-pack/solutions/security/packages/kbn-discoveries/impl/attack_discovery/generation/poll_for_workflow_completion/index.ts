/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';

import type { WorkflowsManagementApi } from '../invoke_alert_retrieval_workflow';

/** Default polling interval in milliseconds */
const DEFAULT_POLL_INTERVAL_MS = 500;

/** Maximum time to wait for workflow completion in milliseconds (5 minutes) */
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000;

/**
 * Shorter polling interval used when the execution has reached a terminal status
 * but step execution metadata is not yet available (readiness re-poll phase).
 */
const READINESS_POLL_INTERVAL_MS = 100;

/**
 * Default maximum time to wait for step metadata to become available after the
 * workflow reaches a terminal status (5 seconds).
 */
const DEFAULT_READINESS_TIMEOUT_MS = 5000;

const delay = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

/**
 * Polls until a workflow execution reaches a terminal status and, optionally,
 * until an `isReady` predicate is satisfied.
 *
 * ## Why `isReady` exists — workflow engine persistence race condition
 *
 * The Kibana workflow engine persists workflow execution state via two parallel
 * Elasticsearch operations during its final flush:
 *
 *   1. Update the workflow execution document (sets terminal status + stepExecutionIds)
 *   2. Bulk-upsert step execution documents
 *
 * Because these writes are independent ES operations running in parallel
 * (`Promise.all([flushWorkflowChanges(), flushStepChanges()])`), the execution
 * document may become visible with a terminal status **before** the step
 * execution documents have been written. A consumer polling for completion can
 * therefore observe a `completed` execution with an empty `stepExecutions`
 * array, leading to "step not found" errors when extracting results.
 *
 * Fast-executing workflows (e.g. ES|QL alert retrieval) are especially prone
 * because they may complete within a single persistence cycle (~500ms), meaning
 * no intermediate flush ever pre-populates the step execution documents.
 *
 * The `isReady` predicate allows callers to specify a condition that must hold
 * (e.g. "the expected step execution exists") before the poll returns. When the
 * execution is terminal but the predicate fails, the poller re-fetches with a
 * shorter interval for a bounded window (`readinessTimeoutMs`), giving the
 * engine time to finish writing step metadata.
 *
 * We cannot change the platform workflow engine's persistence model, so this
 * predicate-based approach is the consumer-side workaround.
 */
export const pollForWorkflowCompletion = async ({
  executionId,
  isReady,
  logger,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  spaceId,
  workflowsManagementApi,
}: {
  executionId: string;
  isReady?: (execution: WorkflowExecutionDto) => boolean;
  logger: Logger;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  readinessTimeoutMs?: number;
  spaceId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<WorkflowExecutionDto> => {
  const startTime = Date.now();
  // Lazily initialized via ??= the first time the workflow reaches terminal status
  // but step metadata is not yet ready — tracks the start of the readiness re-poll window.
  let readinessPollStartMs: number | undefined;

  while (Date.now() - startTime < maxWaitMs) {
    const execution = await workflowsManagementApi.getWorkflowExecution(executionId, spaceId, {
      includeOutput: true,
    });

    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    if (isTerminalStatus(execution.status as ExecutionStatus)) {
      // Non-completed terminal statuses (failed, cancelled, timed_out) are
      // returned immediately — their step data may legitimately be empty.
      if (execution.status !== ExecutionStatus.COMPLETED || !isReady || isReady(execution)) {
        return execution;
      }

      // Terminal + completed but step metadata not yet available.
      // Re-poll with a shorter interval for a bounded window.
      readinessPollStartMs ??= Date.now();
      const readinessElapsedMs = Date.now() - readinessPollStartMs;

      if (readinessElapsedMs >= readinessTimeoutMs) {
        logger.warn(
          `Workflow execution ${executionId} reached terminal status but step metadata not available after ${readinessTimeoutMs}ms — returning execution as-is`
        );
        return execution;
      }

      logger.debug(
        () =>
          `Workflow terminal (${execution.status}) but step metadata not yet ready, re-polling (elapsed: ${readinessElapsedMs}ms / ${readinessTimeoutMs}ms)`
      );

      await delay(READINESS_POLL_INTERVAL_MS);
    } else {
      logger.debug(
        () =>
          `Waiting for workflow to complete (execution: ${executionId}, status: ${
            execution.status
          }, elapsed: ${Date.now() - startTime}ms)`
      );

      await delay(pollIntervalMs);
    }
  }

  throw new Error(`Workflow timed out after ${maxWaitMs}ms (execution: ${executionId})`);
};
