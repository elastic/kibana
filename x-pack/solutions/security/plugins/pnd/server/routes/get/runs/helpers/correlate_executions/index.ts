/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { pndWatchDocumentId } from '@kbn/pnd-common';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { readCorrelationIdFromEvent } from '@kbn/workflows/managed';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';

/**
 * A recent workflow execution paired with the watch it belongs to and the Attack Discovery
 * correlation decoded from its execution `context.event`.
 */
export interface CorrelatedExecution {
  /** Attack Discovery 2.0 alert id the run was triggered for; empty when uncorrelated. */
  correlationId: string;
  /** The raw `context.event` object the trigger emitted, when present. */
  event: Record<string, unknown> | undefined;
  /** The execution list item (no step executions, yaml or definition). */
  execution: WorkflowExecutionListItemDto;
  /** The managed system-watch id this execution was listed under. */
  watchId: string;
}

export interface CorrelateExecutionsParams {
  /** ISO 8601 upper bound on `startedAt`; ignored when it is not a parseable date. */
  end?: string;
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /**
   * Maximum number of executions to keep **after** merging every watch, newest first. Defaults to
   * `size`, which makes the cap *shared* across watches — right for a paged list, wrong for a
   * correlation, where one busy watch can crowd another's runs out of the merged window entirely and
   * the caller then sees an uncorrelated result with no error at all. Pass
   * `size * watchIds.length` to make the cap per-workflow, which is what the four-phase projection
   * does now that it correlates three workflows instead of two.
   */
  mergedSize?: number;
  /**
   * Incoming request, forwarded so the management client can assert managed-execution read.
   * Write paths that share this helper omit it.
   */
  request?: KibanaRequest;
  /** Maximum number of executions to list per watch, newest first; also the default merged cap. */
  size: number;
  /** Space resolved from the request (security finding S9). */
  spaceId: string;
  /** ISO 8601 lower bound on `startedAt`; ignored when it is not a parseable date. */
  start?: string;
  /** Managed system-watch ids to list executions for (e.g. the two orchestrators). */
  watchIds: readonly string[];
}

/** Read the Attack Discovery trigger event out of a persisted execution `context`. */
const readEvent = (
  context: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
  const event = context?.event;
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return undefined;
  }
  return event as Record<string, unknown>;
};

/** Milliseconds since epoch for an ISO timestamp, or `NaN` when it is missing/unparseable. */
const toTime = (value: string | undefined): number => (value ? Date.parse(value) : NaN);

/**
 * Whether an execution's `startedAt` falls within the optional `[start, end]` bounds. A bound is
 * only enforced when it parses as a date (the contract also allows date-math, which cannot be
 * evaluated here without Elasticsearch), and an unparseable `startedAt` is kept rather than dropped.
 */
const withinBounds = (startedAt: string, start: string | undefined, end: string | undefined) => {
  const started = toTime(startedAt);
  if (Number.isNaN(started)) {
    return true;
  }
  const startTime = toTime(start);
  if (!Number.isNaN(startTime) && started < startTime) {
    return false;
  }
  const endTime = toTime(end);
  if (!Number.isNaN(endTime) && started > endTime) {
    return false;
  }
  return true;
};

/** Sort executions newest-first by `startedAt`; missing/unparseable timestamps sort last. */
const byStartedAtDesc = (
  a: WorkflowExecutionListItemDto,
  b: WorkflowExecutionListItemDto
): number => {
  const aTime = toTime(a.startedAt);
  const bTime = toTime(b.startedAt);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
};

/**
 * Correlate recent workflow executions across a set of managed watches with the Attack Discovery
 * alert that triggered each. Execution `context` is persisted but **unmapped** (`dynamic: false`),
 * so this is inherently retrieve-then-filter, never a term query: it lists each watch's recent
 * executions (bounded by `size`), merges and sorts them newest-first, slices to `mergedSize` (which
 * defaults to `size`), then reads each survivor's full execution once to decode `context.event`.
 * There are no implicit time bounds, so a discovery older than the window correlates to nothing —
 * callers must treat an empty result as "not found in the window", not as "never ran".
 * `getWorkflowExecution` enforces
 * exact `spaceId` equality (S9), so no run from another space leaks. Per-watch and per-run failures
 * degrade to an empty result / empty correlation rather than failing the whole listing.
 *
 * This is the single shared correlation primitive — the runs list and the four-phase execution
 * projection both consume it, so it must not be duplicated.
 */
export const correlateExecutions = async ({
  end,
  logger,
  managementClient,
  mergedSize,
  request,
  size,
  spaceId,
  start,
  watchIds,
}: CorrelateExecutionsParams): Promise<CorrelatedExecution[]> => {
  const perWatch = await Promise.all(
    watchIds.map(
      async (
        watchId
      ): Promise<Array<{ execution: WorkflowExecutionListItemDto; watchId: string }>> => {
        try {
          const { results } =
            request == null
              ? await managementClient.getWorkflowExecutions(
                  { page: 1, size, workflowId: pndWatchDocumentId(watchId, spaceId) },
                  spaceId
                )
              : await managementClient.getWorkflowExecutions(
                  { page: 1, size, workflowId: pndWatchDocumentId(watchId, spaceId) },
                  spaceId,
                  request
                );
          return results.map((execution) => ({ execution, watchId }));
        } catch (error) {
          logger.debug(
            () =>
              `Failed to list executions for watch "${watchId}": ${
                error instanceof Error ? error.message : String(error)
              }`
          );
          return [];
        }
      }
    )
  );

  const merged = perWatch
    .flat()
    .filter(({ execution }) => withinBounds(execution.startedAt, start, end))
    .sort((a, b) => byStartedAtDesc(a.execution, b.execution))
    .slice(0, mergedSize ?? size);

  return Promise.all(
    merged.map(async ({ execution, watchId }): Promise<CorrelatedExecution> => {
      try {
        const full =
          request == null
            ? await managementClient.getWorkflowExecution(execution.id, spaceId)
            : await managementClient.getWorkflowExecution(execution.id, spaceId, { request });
        const event = readEvent(full?.context);
        return {
          correlationId: readCorrelationIdFromEvent(event),
          event,
          execution,
          watchId,
        };
      } catch (error) {
        logger.debug(
          () =>
            `Failed to decode context for execution "${execution.id}": ${
              error instanceof Error ? error.message : String(error)
            }`
        );
        return { correlationId: '', event: undefined, execution, watchId };
      }
    })
  );
};
