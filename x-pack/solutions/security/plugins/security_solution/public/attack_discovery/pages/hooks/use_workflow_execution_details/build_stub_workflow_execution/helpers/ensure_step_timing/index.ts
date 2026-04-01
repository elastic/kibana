/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StubStepTimingState, StubWorkflowExecutionState } from '../stub_execution_state';

const DEFAULT_COMPLETED_STEP_DURATION_MS = 500;

export const isTerminalStatus = (status: ExecutionStatus): boolean => {
  switch (status) {
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.COMPLETED:
    case ExecutionStatus.FAILED:
    case ExecutionStatus.SKIPPED:
    case ExecutionStatus.TIMED_OUT:
      return true;
    default:
      return false;
  }
};

export const ensureStepTiming = ({
  nowMs,
  state,
  stepId,
  status,
}: {
  nowMs: number;
  state: StubWorkflowExecutionState;
  stepId: string;
  status: ExecutionStatus;
}): StubStepTimingState => {
  const current = state.stepTimingByStepId.get(stepId) ?? {};

  // First observation of a running step: lock in its startedAt once.
  if (status === ExecutionStatus.RUNNING && current.startedAtMs == null) {
    current.startedAtMs = nowMs;
  }

  // First observation of a terminal step: synthesize a small duration if we never observed RUNNING.
  if (isTerminalStatus(status) && current.finishedAtMs == null) {
    const finishedAtMs = nowMs;
    const startedAtMs =
      current.startedAtMs != null
        ? current.startedAtMs
        : finishedAtMs - DEFAULT_COMPLETED_STEP_DURATION_MS;

    current.finishedAtMs = finishedAtMs;
    current.startedAtMs = startedAtMs;
    current.executionTimeMs = Math.max(1, finishedAtMs - startedAtMs);
  }

  // Persist last observed status for completeness/debuggability.
  current.status = status;

  state.stepTimingByStepId.set(stepId, current);

  return current;
};
