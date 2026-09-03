/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';

/** One PND watch run parked on an input wait, as {@link listPendingPndGates} reads it. */
export interface ParkedRunMock {
  /** Correlated Attack Discovery id, placed on the run's `context.event`. Omit for uncorrelated. */
  correlationId?: string;
  runId: string;
  startedAt?: string;
  /** Step executions the per-run read returns — pending gates and their predecessors. */
  stepExecutions: unknown[];
  /**
   * Defaults to the Watch Floor, which owns three of the four registered gates since
   * kibana-phf4.5 relocated the lane there (ADR-015) — so an unset `workflowId` still resolves a
   * gate definition rather than silently returning no pending gates.
   */
  workflowId?: string;
}

/** The two management-client calls {@link listPendingPndGates} makes. */
export interface PendingGatesManagementClientMock {
  getWorkflowExecution: jest.Mock;
  getWorkflowExecutions: jest.Mock;
}

/**
 * Build the management-client surface {@link listPendingPndGates} reads: parked executions per
 * watch, then one full read per run. Mirrors the live shape for a **global** (`'*'`) managed watch,
 * where the execution documents carry the emitting space rather than the workflow's own (bead
 * `kibana-idjb.21`).
 */
export const createPendingGatesManagementClientMock = (
  runs: ParkedRunMock[]
): PendingGatesManagementClientMock => ({
  getWorkflowExecution: jest.fn().mockImplementation(async (runId: string) => {
    const run = runs.find((candidate) => candidate.runId === runId);
    if (run == null) {
      return null;
    }
    return {
      context: run.correlationId == null ? {} : { event: { correlationId: run.correlationId } },
      stepExecutions: run.stepExecutions,
    };
  }),
  getWorkflowExecutions: jest
    .fn()
    .mockImplementation(async ({ workflowId }: { workflowId: string }) => ({
      results: runs
        .filter((run) => {
          const definitionId = run.workflowId ?? SYSTEM_SECURITY_WATCH_FLOOR_ID;
          return workflowId === definitionId || workflowId.startsWith(`${definitionId}-`);
        })
        .map((run) => ({
          id: run.runId,
          startedAt: run.startedAt ?? '2026-08-02T00:00:00.000Z',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          workflowId: run.workflowId ?? SYSTEM_SECURITY_WATCH_FLOOR_ID,
        })),
    })),
});
