/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndRun } from '@kbn/pnd-common';

import type { CorrelatedExecution } from '../correlate_executions';
import { buildRunDeepLink } from '../build_run_deep_link';
import { buildRunSummary } from '../build_run_summary';
import {
  isTerminalRunStatus,
  isUnsuccessfulTerminalRunStatus,
  mapRunStatus,
} from '../map_run_status';

/** Upper bound on a run's failure `reason`, matching the `PndRun.reason` contract (`max(4096)`). */
export const RUN_REASON_MAX_LENGTH = 4096;

export interface BuildRunRowsParams {
  /** Correlated executions, newest first (from {@link correlateExecutions}). */
  correlated: CorrelatedExecution[];
  /**
   * `workflowRunId → the run's pending PND gate step execution ids` (from
   * {@link resolvePendingGateStepExecutionIds}). The badge count is the array's length, and a run
   * parked at exactly one gate deep-links to that step (F1).
   */
  pendingGateStepExecutionIdsByRunId: Map<string, readonly string[]>;
  /**
   * Attack Discovery alert ids the calling user can read, resolved via the `_find?ids=` check
   * (security finding S3). A run whose correlated discovery is **not** in this set is dropped so a
   * caller can never see a run row for a discovery they cannot read. Runs with no correlation are
   * kept — they expose no Attack Discovery content.
   */
  readableAttackDiscoveryAlertIds: Set<string>;
}

/**
 * Project correlated executions into {@link PndRun} rows for the runs list.
 *
 * Applies the S3 IDOR filter (drop runs whose correlated discovery the caller cannot read), maps the
 * engine status onto the closed {@link PndRun} status enum, composes a server-side summary sentence,
 * counts pending gates, and builds the Workflows-app deep link — step-level when the run has a
 * single pending gate (F1). `endedAt` and `reason` are only set for terminal runs; `triggeredBy` is
 * passed through when the engine recorded it.
 */
export const buildRunRows = ({
  correlated,
  pendingGateStepExecutionIdsByRunId,
  readableAttackDiscoveryAlertIds,
}: BuildRunRowsParams): PndRun[] =>
  correlated.flatMap(({ correlationId, execution, watchId }): PndRun[] => {
    // S3: never surface a run row for a discovery the caller cannot read.
    if (correlationId !== '' && !readableAttackDiscoveryAlertIds.has(correlationId)) {
      return [];
    }

    const status = mapRunStatus(execution.status);
    const pendingGateStepExecutionIds = pendingGateStepExecutionIdsByRunId.get(execution.id) ?? [];
    const pendingGateCount = pendingGateStepExecutionIds.length;
    // F1: a run parked at exactly one gate has a single interesting step, so its link lands on that
    // step. With none — or several, where picking one would be arbitrary — the link stays at the
    // execution level.
    const stepExecutionId = pendingGateCount === 1 ? pendingGateStepExecutionIds[0] : undefined;
    const workflowId = execution.workflowId ?? watchId;
    const reason =
      isUnsuccessfulTerminalRunStatus(status) && execution.error?.message
        ? execution.error.message.slice(0, RUN_REASON_MAX_LENGTH)
        : undefined;
    const endedAt =
      isTerminalRunStatus(status) && execution.finishedAt ? execution.finishedAt : undefined;

    return [
      {
        correlationId,
        deepLinkPath: buildRunDeepLink({ executionId: execution.id, stepExecutionId, workflowId }),
        ...(endedAt != null ? { endedAt } : {}),
        executionId: execution.id,
        pendingGateCount,
        ...(reason != null ? { reason } : {}),
        startedAt: execution.startedAt,
        status,
        summary: buildRunSummary({ correlationId, pendingGateCount, reason, status }),
        ...(execution.triggeredBy != null ? { triggeredBy: execution.triggeredBy } : {}),
        watchId,
        workflowId,
        workflowRunId: execution.id,
      },
    ];
  });
