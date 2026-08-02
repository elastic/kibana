/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/** Milliseconds since epoch for an ISO timestamp, or `NaN` when it is missing/unparseable. */
const toTime = (value: string | undefined): number => (value ? Date.parse(value) : NaN);

/**
 * Whether step execution `a` is a **later** instance of the same `stepId` than `b`. The same step
 * can execute more than once (loops, retries), so instances are ordered by `stepExecutionIndex`
 * (the execution index within a `stepId`, higher = later) and tie-broken by `startedAt`. The
 * latest instance is the one the flyout should reflect.
 *
 * `stepExecutionIndex` is only meaningful **within one run**, which is why the caller must narrow to
 * one run per workflow first (see {@link selectLatestRunPerWorkflow}). Comparing it across two runs
 * of the same workflow — which a re-triggered discovery produces — can let a stale run's step win.
 */
const isLaterStepExecution = (
  a: WorkflowStepExecutionDto,
  b: WorkflowStepExecutionDto
): boolean => {
  if (a.stepExecutionIndex !== b.stepExecutionIndex) {
    return a.stepExecutionIndex > b.stepExecutionIndex;
  }
  return toTime(a.startedAt) > toTime(b.startedAt);
};

/**
 * Reduce a flat list of step executions (aggregated across the correlated executions) to the latest
 * instance of each `stepId`. Keying by `stepId` is what lets the projection correlate a catalog row
 * to its execution: the catalog's `orchestratorStepId` values are exactly the step names the
 * corresponding YAML uses.
 *
 * The correlated workflows share one map because their `stepId` sets are disjoint: the Post-Incident
 * Watch owns Phase 4's `draft_tuning` / `apply_tuning` and the Watch Floor owns the rest.
 *
 * **Precondition:** the input holds at most one run per workflow — see
 * {@link selectLatestRunPerWorkflow}, which the route applies before reading step executions.
 */
export const selectStepExecutions = (
  stepExecutions: WorkflowStepExecutionDto[]
): Map<string, WorkflowStepExecutionDto> =>
  stepExecutions.reduce((byStepId, stepExecution) => {
    const existing = byStepId.get(stepExecution.stepId);
    if (existing == null || isLaterStepExecution(stepExecution, existing)) {
      byStepId.set(stepExecution.stepId, stepExecution);
    }
    return byStepId;
  }, new Map<string, WorkflowStepExecutionDto>());
