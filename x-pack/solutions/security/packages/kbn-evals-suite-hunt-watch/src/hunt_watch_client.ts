/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ConcurrencySlotOccupyingExecutionStatuses,
  TerminalExecutionStatuses,
} from '@kbn/workflows';
import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { HUNT_WORKER_WORKFLOW_ID, PUBLIC_API_VERSION } from './constants';
import { apiVersion, sleep, spacePath } from './kibana_api';

const isTerminal = (status: ExecutionStatus) => TerminalExecutionStatuses.includes(status);

export interface HuntWatchRunResult {
  spaceId: string;
  workflowExecutionId: string;
  execution: WorkflowExecutionDto;
  stepExecutions: WorkflowStepExecutionDto[];
}

/**
 * Drives manual runs of the per-space Hunt Watch Worker. Does not create the Worker or its
 * children (see {@link assertWorkflowInstalled} in `./workflow_fixture`) — it only triggers and
 * polls the artifact that ships.
 */
export class HuntWatchClient {
  private readonly pendingExecutions: Array<{ spaceId: string; workflowExecutionId: string }> = [];

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  private executionPath(spaceId: string, workflowExecutionId: string, suffix = ''): string {
    return spacePath(
      spaceId,
      `/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}${suffix}`
    );
  }

  private async pollExecution({
    spaceId,
    workflowExecutionId,
    maxWaitMs,
    pollIntervalMs,
  }: {
    spaceId: string;
    workflowExecutionId: string;
    maxWaitMs: number;
    pollIntervalMs: number;
  }): Promise<WorkflowExecutionDto> {
    const deadline = Date.now() + maxWaitMs;
    let execution: WorkflowExecutionDto;
    do {
      execution = await this.fetch<WorkflowExecutionDto>(
        this.executionPath(spaceId, workflowExecutionId),
        {
          method: 'GET',
          headers: apiVersion(PUBLIC_API_VERSION),
          query: { includeOutput: true },
        }
      );
      if (isTerminal(execution.status)) break;
      await sleep(pollIntervalMs);
    } while (Date.now() < deadline);
    return execution;
  }

  private async listSlotHolders(spaceId: string, workflowId: string): Promise<string[]> {
    const { results } = await this.fetch<WorkflowExecutionListDto>(
      spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions`),
      {
        method: 'GET',
        headers: apiVersion(PUBLIC_API_VERSION),
        query: { statuses: [...ConcurrencySlotOccupyingExecutionStatuses], size: 100 },
      }
    );
    return results.map(({ id }) => id);
  }

  /**
   * Cancels every execution of the space's Worker that holds its single concurrency slot and
   * waits for them to finish. Without this, a run abandoned by a failed or retried test (e.g. a
   * Playwright retry after an ES timeout) keeps the slot, and every later trigger is dropped.
   */
  private async freeWorkerSlot({
    spaceId,
    workflowId,
    maxWaitMs,
    pollIntervalMs,
  }: {
    spaceId: string;
    workflowId: string;
    maxWaitMs: number;
    pollIntervalMs: number;
  }): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    const cancelled = new Set<string>();
    let holders = await this.listSlotHolders(spaceId, workflowId);
    while (holders.length > 0) {
      const fresh = holders.filter((id) => !cancelled.has(id));
      if (fresh.length > 0) {
        this.log.warning(
          `Cancelling ${fresh.length} Worker execution(s) still holding the slot in space ` +
            `"${spaceId}" before triggering: ${fresh.join(', ')}`
        );
        await Promise.allSettled(
          fresh.map((id) =>
            this.fetch(this.executionPath(spaceId, id, '/cancel'), {
              method: 'POST',
              headers: apiVersion(PUBLIC_API_VERSION),
            })
          )
        );
        fresh.forEach((id) => cancelled.add(id));
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Worker executions [${holders.join(', ')}] in space "${spaceId}" still hold the ` +
            `Worker's concurrency slot ${maxWaitMs}ms after being cancelled; a trigger now ` +
            `would be dropped.`
        );
      }
      await sleep(pollIntervalMs);
      holders = await this.listSlotHolders(spaceId, workflowId);
    }
  }

  /**
   * Manually triggers the per-space Worker with named `reportIds` and polls to a terminal state.
   * Frees the Worker's slot first (see {@link freeWorkerSlot}). An accepted run whose execution
   * still ends with no step executions is a trigger dropped by the Worker's per-space
   * `concurrency: { strategy: drop, max: 1 }`, and throws rather than returning what looks like
   * an empty sweep.
   */
  async run({
    spaceId,
    reportIds,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 5_000,
    slotWaitMs = 2 * 60_000,
  }: {
    spaceId: string;
    reportIds: string[];
    maxWaitMs?: number;
    pollIntervalMs?: number;
    slotWaitMs?: number;
  }): Promise<HuntWatchRunResult> {
    const workflowId = `${HUNT_WORKER_WORKFLOW_ID}-${spaceId}`;
    await this.freeWorkerSlot({ spaceId, workflowId, maxWaitMs: slotWaitMs, pollIntervalMs });
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`),
      {
        method: 'POST',
        headers: apiVersion(PUBLIC_API_VERSION),
        body: JSON.stringify({ inputs: { reportIds } }),
      }
    );

    this.log.info(
      `Started Hunt Watch Worker execution ${workflowExecutionId} in space "${spaceId}" for reportIds=[${reportIds.join(
        ', '
      )}]`
    );
    this.pendingExecutions.push({ spaceId, workflowExecutionId });

    const execution = await this.pollExecution({
      spaceId,
      workflowExecutionId,
      maxWaitMs,
      pollIntervalMs,
    });

    if (isTerminal(execution.status)) {
      // Only in-flight runs are cancelled at teardown; a finished one has nothing to cancel.
      const index = this.pendingExecutions.findIndex(
        (pending) => pending.workflowExecutionId === workflowExecutionId
      );
      if (index !== -1) this.pendingExecutions.splice(index, 1);
    } else {
      this.log.warning(
        `Worker execution ${workflowExecutionId} in space "${spaceId}" did not reach a terminal ` +
          `state within ${maxWaitMs}ms (last status: ${execution.status})`
      );
    }

    const stepExecutions = execution.stepExecutions ?? [];
    if (stepExecutions.length === 0) {
      throw new Error(
        `Worker execution ${workflowExecutionId} in space "${spaceId}" ended with no step ` +
          `executions for reportIds=[${reportIds.join(', ')}]. The Worker's per-space ` +
          `"concurrency: { strategy: drop, max: 1 }" drops a trigger that races another sweep; ` +
          `this suite runs one row at a time, so something else (e.g. the scheduled trigger) is ` +
          `also running this space's Worker.`
      );
    }

    return { spaceId, workflowExecutionId, execution, stepExecutions };
  }

  async cancelPending(): Promise<void> {
    await Promise.allSettled(
      this.pendingExecutions.map(({ spaceId, workflowExecutionId }) =>
        this.fetch(this.executionPath(spaceId, workflowExecutionId, '/cancel'), {
          method: 'POST',
          headers: apiVersion(PUBLIC_API_VERSION),
        }).then(() => this.log.debug(`Cancelled Worker execution ${workflowExecutionId}`))
      )
    );
    this.pendingExecutions.length = 0;
  }
}
