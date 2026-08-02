/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelatedExecution } from '../../../runs/helpers/correlate_executions';

/** Milliseconds since epoch for an ISO timestamp, or `NaN` when it is missing/unparseable. */
const toTime = (value: string | undefined): number => (value ? Date.parse(value) : NaN);

/**
 * Whether correlated execution `a` started **later** than `b`. A run whose `startedAt` cannot be
 * parsed never wins, so an undated run can only be selected when it is the only candidate; equal or
 * unparseable timestamps keep the incumbent, which makes the choice deterministic and, given
 * {@link correlateExecutions} returns newest-first, the best available guess.
 */
const isLaterRun = (a: CorrelatedExecution, b: CorrelatedExecution): boolean => {
  const aTime = toTime(a.execution.startedAt);
  if (Number.isNaN(aTime)) {
    return false;
  }
  const bTime = toTime(b.execution.startedAt);
  return Number.isNaN(bTime) || aTime > bTime;
};

/**
 * Reduce the executions correlated to one Attack Discovery down to **one run per workflow** — the
 * newest by `startedAt` — and return those run ids.
 *
 * This is the invariant the four-phase projection depends on. Re-triggering the same discovery (or
 * re-running a watch) produces more than one correlated run of the same workflow, and
 * {@link selectStepExecutions} then compares `stepExecutionIndex` **across** those runs, where the
 * index is only meaningful *within* a run. A stale run's step could therefore win, pointing the
 * row's `workflowRunId` and `deepLinkPath` at an older execution while the rest of the timeline
 * described the current one — a link that silently lands on the wrong run. Narrowing here rather
 * than in the step reducer also avoids reading step executions for runs whose steps can never be
 * used.
 *
 * Each workflow is judged independently: a Post-Incident Watch run started after the Watch Floor's
 * is not "newer than" it in any sense that matters, since their step id sets are disjoint. Run ids
 * come back in the order each workflow was first seen, which for a newest-first input is stable.
 */
export const selectLatestRunPerWorkflow = (
  correlated: readonly CorrelatedExecution[]
): string[] => {
  const latestByWatchId = correlated.reduce((byWatchId, candidate) => {
    const incumbent = byWatchId.get(candidate.watchId);
    if (incumbent == null || isLaterRun(candidate, incumbent)) {
      byWatchId.set(candidate.watchId, candidate);
    }
    return byWatchId;
  }, new Map<string, CorrelatedExecution>());

  return [...latestByWatchId.values()].map(({ execution }) => execution.id);
};
