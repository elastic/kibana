/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { HUNT_WORKER_WORKFLOW_ID, WORKFLOWS_API_VERSION } from './constants';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const shouldStopPolling = (status: ExecutionStatus) => TerminalExecutionStatuses.includes(status);

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

  private workerWorkflowId(spaceId: string): string {
    return `${HUNT_WORKER_WORKFLOW_ID}-${spaceId}`;
  }

  private async pollExecution({
    spaceId,
    workflowExecutionId,
    isDone,
    maxWaitMs,
    pollIntervalMs,
  }: {
    spaceId: string;
    workflowExecutionId: string;
    isDone: (status: ExecutionStatus) => boolean;
    maxWaitMs: number;
    pollIntervalMs: number;
  }): Promise<WorkflowExecutionDto> {
    const deadline = Date.now() + maxWaitMs;
    let execution: WorkflowExecutionDto | undefined;

    while (Date.now() < deadline) {
      execution = await this.fetch<WorkflowExecutionDto>(
        `/s/${encodeURIComponent(spaceId)}/api/workflows/executions/${encodeURIComponent(
          workflowExecutionId
        )}`,
        {
          method: 'GET',
          version: WORKFLOWS_API_VERSION,
          headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
          query: { includeOutput: true },
        }
      );

      if (isDone(execution.status)) break;
      await sleep(pollIntervalMs);
    }

    if (!execution) {
      throw new Error(`No execution state returned while polling ${workflowExecutionId}`);
    }
    return execution;
  }

  /**
   * Manually triggers the per-space Worker with named `reportIds`, then polls to a terminal
   * state. Per-space `concurrency: { strategy: drop, max: 1 }` on the Worker means a second
   * concurrent trigger in the same space is silently dropped rather than queued — a run request
   * that is accepted but whose execution immediately ends with no step executions is treated as
   * a dropped trigger and throws naming the space and report ids, rather than returning a
   * execution that looks like an empty-but-successful sweep.
   */
  async run({
    spaceId,
    reportIds,
    maxWaitMs = 10 * 60_000,
    pollIntervalMs = 5_000,
  }: {
    spaceId: string;
    reportIds: string[];
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }): Promise<HuntWatchRunResult> {
    const workflowId = this.workerWorkflowId(spaceId);
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      `/s/${encodeURIComponent(spaceId)}/api/workflows/workflow/${encodeURIComponent(
        workflowId
      )}/run`,
      {
        method: 'POST',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
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
      isDone: shouldStopPolling,
      maxWaitMs,
      pollIntervalMs,
    });

    if (!shouldStopPolling(execution.status)) {
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
          `"concurrency: { strategy: drop, max: 1 }" setting silently drops a trigger that races ` +
          `another sweep in the same space — this suite runs with workers:1 and concurrency:1 ` +
          `specifically to avoid that, so an empty step tree here means something else is also ` +
          `triggering this space's Worker (e.g. the scheduled trigger) during the eval run.`
      );
    }

    return { spaceId, workflowExecutionId, execution, stepExecutions };
  }

  async cancelPending(): Promise<void> {
    await Promise.allSettled(
      this.pendingExecutions.map(({ spaceId, workflowExecutionId }) =>
        this.fetch(
          `/s/${encodeURIComponent(spaceId)}/api/workflows/executions/${encodeURIComponent(
            workflowExecutionId
          )}/cancel`,
          {
            method: 'POST',
            version: WORKFLOWS_API_VERSION,
            headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
          }
        ).then(() => this.log.debug(`Cancelled Worker execution ${workflowExecutionId}`))
      )
    );
    this.pendingExecutions.length = 0;
  }
}
