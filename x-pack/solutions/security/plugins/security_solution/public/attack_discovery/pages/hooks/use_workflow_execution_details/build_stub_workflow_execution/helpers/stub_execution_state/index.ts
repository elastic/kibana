/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionStatus } from '@kbn/workflows';

const MAX_STUB_STATE_ENTRIES = 100;

export interface StubStepTimingState {
  executionTimeMs?: number;
  finishedAtMs?: number;
  startedAtMs?: number;
  status?: ExecutionStatus;
}

export interface StubWorkflowExecutionState {
  finishedAtMs?: number;
  startedAtMs: number;
  stepTimingByStepId: Map<string, StubStepTimingState>;
}

export const stubExecutionStateByRunId = new Map<string, StubWorkflowExecutionState>();

export const pruneStubStateCache = (): void => {
  if (stubExecutionStateByRunId.size <= MAX_STUB_STATE_ENTRIES) {
    return;
  }

  const oldestKey = stubExecutionStateByRunId.keys().next().value as string | undefined;
  if (oldestKey) {
    stubExecutionStateByRunId.delete(oldestKey);
  }
};

export const getOrCreateStubExecutionState = (
  workflowRunId: string
): StubWorkflowExecutionState => {
  const existing = stubExecutionStateByRunId.get(workflowRunId);
  if (existing) {
    return existing;
  }

  const next: StubWorkflowExecutionState = {
    startedAtMs: Date.now(),
    stepTimingByStepId: new Map<string, StubStepTimingState>(),
  };

  stubExecutionStateByRunId.set(workflowRunId, next);
  pruneStubStateCache();

  return next;
};
