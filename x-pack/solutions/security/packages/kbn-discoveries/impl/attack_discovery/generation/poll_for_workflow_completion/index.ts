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

/** Initial polling interval in milliseconds (fast, to catch quick workflows) */
const DEFAULT_INITIAL_POLL_INTERVAL_MS = 500;

/**
 * Upper bound the polling interval backs off toward. Caps the wait so a freshly
 * completed long-running workflow is still observed within a few seconds.
 */
const DEFAULT_MAX_POLL_INTERVAL_MS = 3000;

/** Multiplier applied to the polling interval after each running poll (backoff). */
const POLL_BACKOFF_MULTIPLIER = 1.5;

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
 *
 * ## Polling cost controls
 *
 * Two measures keep the Elasticsearch read cost proportional to the work:
 *
 *   1. **Status-only polling.** While the workflow is still running we fetch
 *      with `includeOutput: false`, so the (potentially large) execution and
 *      step `output` payloads are excluded from every intermediate read. The
 *      full payload is fetched exactly once, after a terminal status is
 *      observed, because that is the only point at which consumers need it.
 *   2. **Adaptive backoff.** The interval starts at `pollIntervalMs` (fast, so
 *      sub-second workflows are caught quickly) and grows by
 *      `POLL_BACKOFF_MULTIPLIER` up to `maxPollIntervalMs`. Long LLM-bound
 *      phases therefore incur a handful of polls instead of hundreds, while
 *      the worst-case added completion latency is bounded by `maxPollIntervalMs`.
 */
export const pollForWorkflowCompletion = async ({
  executionId,
  isReady,
  logger,
  maxPollIntervalMs = DEFAULT_MAX_POLL_INTERVAL_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  pollIntervalMs = DEFAULT_INITIAL_POLL_INTERVAL_MS,
  readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  spaceId,
  workflowsManagementApi,
}: {
  executionId: string;
  isReady?: (execution: WorkflowExecutionDto) => boolean;
  logger: Logger;
  maxPollIntervalMs?: number;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  readinessTimeoutMs?: number;
  spaceId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}): Promise<WorkflowExecutionDto> => {
  const startTime = Date.now();

  const fetchExecution = async (includeOutput: boolean): Promise<WorkflowExecutionDto> => {
    const execution = await workflowsManagementApi.getWorkflowExecution(executionId, spaceId, {
      includeOutput,
    });

    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    return execution;
  };

  // Phase 1: poll status-only (output excluded) with adaptive backoff until terminal.
  // `attempt` drives the backoff so the interval is a pure function of the poll
  // count — no execution state is reassigned across an await.
  for (let attempt = 0; ; attempt += 1) {
    const current = await fetchExecution(false);

    if (isTerminalStatus(current.status as ExecutionStatus)) {
      break;
    }

    if (Date.now() - startTime >= maxWaitMs) {
      throw new Error(`Workflow timed out after ${maxWaitMs}ms (execution: ${executionId})`);
    }

    const nextPollInMs = Math.min(
      maxPollIntervalMs,
      Math.round(pollIntervalMs * POLL_BACKOFF_MULTIPLIER ** attempt)
    );
    const status = current.status;
    const elapsedMs = Date.now() - startTime;

    logger.debug(
      () =>
        `Waiting for workflow to complete (execution: ${executionId}, status: ${status}, elapsed: ${elapsedMs}ms, nextPollInMs: ${nextPollInMs})`
    );

    await delay(nextPollInMs);
  }

  // Phase 2: terminal — fetch the full payload (including output) that consumers
  // need. The cost of `includeOutput: true` is paid once, not on every poll.
  const terminalExecution = await fetchExecution(true);

  // Non-completed terminal statuses (failed, cancelled, timed_out) are returned
  // immediately — their step data may legitimately be empty.
  if (
    terminalExecution.status !== ExecutionStatus.COMPLETED ||
    !isReady ||
    isReady(terminalExecution)
  ) {
    return terminalExecution;
  }

  // Terminal + completed but step metadata not yet available.
  // Re-poll with a shorter interval for a bounded window. Recursion keeps each
  // fetched execution in a per-call `const` (no state reassigned across an await)
  // and lets us return the most recent execution on both the ready and timeout paths.
  const readinessPollStartMs = Date.now();

  const pollForStepMetadata = async (): Promise<WorkflowExecutionDto> => {
    const readinessElapsedMs = Date.now() - readinessPollStartMs;

    logger.debug(
      () =>
        `Workflow terminal (${ExecutionStatus.COMPLETED}) but step metadata not yet ready, re-polling (elapsed: ${readinessElapsedMs}ms / ${readinessTimeoutMs}ms)`
    );

    await delay(READINESS_POLL_INTERVAL_MS);
    const candidate = await fetchExecution(true);

    if (isReady(candidate)) {
      return candidate;
    }

    if (Date.now() - readinessPollStartMs >= readinessTimeoutMs) {
      logger.warn(
        `Workflow execution ${executionId} reached terminal status but step metadata not available after ${readinessTimeoutMs}ms — returning execution as-is`
      );
      return candidate;
    }

    return pollForStepMetadata();
  };

  return pollForStepMetadata();
};
