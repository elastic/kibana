/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  TerminalExecutionStatuses,
  type ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  POLL_INTERVAL_MS,
  PUBLIC_API_VERSION,
  RUNNER_TIMEOUT_MS,
  RUNNER_WORKFLOW_ID,
} from './constants';
import { apiVersion, errorMessage, httpStatus, sleep, spacePath } from './kibana_api';

export const isTerminal = (status: ExecutionStatus): boolean =>
  TerminalExecutionStatuses.includes(status);

/** An execution as last read, and how long the wait was if it ran out before the execution settled. */
export interface PolledExecution {
  execution: WorkflowExecutionDto;
  timedOutAfterMs?: number;
}

/**
 * Starts the per-space floor Attack Discovery worker and reads executions back. The runner has
 * to be started by that worker: it dispatches the runner as its service account, and the
 * engine refuses a standalone start of a workflow that needs a delegated identity.
 */
export class AttackDiscoveryWorkerClient {
  private readonly pendingExecutions: Array<{ spaceId: string; executionId: string }> = [];

  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  private executionPath(spaceId: string, executionId: string, suffix = ''): string {
    return spacePath(
      spaceId,
      `/api/workflows/executions/${encodeURIComponent(executionId)}${suffix}`
    );
  }

  async getExecution(spaceId: string, executionId: string): Promise<WorkflowExecutionDto> {
    return this.fetch<WorkflowExecutionDto>(this.executionPath(spaceId, executionId), {
      method: 'GET',
      headers: apiVersion(PUBLIC_API_VERSION),
      query: { includeOutput: true },
    });
  }

  /**
   * Polls until `isDone` accepts the execution or it ends, whichever is first. A timeout
   * returns the last execution seen with `timedOutAfterMs` set rather than throwing, so the
   * evaluators score what exists and report the timeout.
   */
  async poll({
    spaceId,
    executionId,
    maxWaitMs,
    isDone = (execution) => isTerminal(execution.status),
  }: {
    spaceId: string;
    executionId: string;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
  }): Promise<PolledExecution> {
    const deadline = Date.now() + maxWaitMs;
    let execution = await this.getExecution(spaceId, executionId);
    while (!isDone(execution) && !isTerminal(execution.status) && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      execution = await this.getExecution(spaceId, executionId);
    }
    if (!isDone(execution) && !isTerminal(execution.status)) {
      this.log.warning(
        `Execution ${executionId} did not settle within ${maxWaitMs}ms (status ${execution.status})`
      );
      return { execution, timedOutAfterMs: maxWaitMs };
    }
    return { execution };
  }

  /**
   * Finds the runner execution the floor worker started. The runner is a child of the worker's
   * `workflow.execute` step, so it appears only once that step has begun. Returns undefined when
   * the worker ended without ever starting one (it failed or was refused first).
   */
  private async findRunnerExecution({
    spaceId,
    floorExecutionId,
    maxWaitMs,
  }: {
    spaceId: string;
    floorExecutionId: string;
    maxWaitMs: number;
  }): Promise<string | undefined> {
    const deadline = Date.now() + maxWaitMs;
    for (;;) {
      const children = await this.fetch<Array<{ workflowId: string; executionId: string }>>(
        this.executionPath(spaceId, floorExecutionId, '/children'),
        { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
      );
      const runner = children.find(({ workflowId }) => workflowId === RUNNER_WORKFLOW_ID);
      if (runner) return runner.executionId;
      const floor = await this.getExecution(spaceId, floorExecutionId);
      if (isTerminal(floor.status) || Date.now() >= deadline) return undefined;
      await sleep(POLL_INTERVAL_MS);
    }
  }

  /**
   * Starts the per-space floor worker and follows it to the runner it dispatches, then polls the
   * runner to completion. A timeout or an execution with no steps is returned, not thrown, so the
   * row is scored (and fails by name) instead of vanishing from the results. When the worker
   * ends without starting a runner, the worker's own execution is returned.
   */
  async run({
    spaceId,
    floorWorkflowId,
    maxWaitMs = RUNNER_TIMEOUT_MS,
  }: {
    spaceId: string;
    floorWorkflowId: string;
    maxWaitMs?: number;
  }): Promise<PolledExecution> {
    const { workflowExecutionId: floorExecutionId } = await this.fetch<{
      workflowExecutionId: string;
    }>(spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(floorWorkflowId)}/run`), {
      method: 'POST',
      headers: apiVersion(PUBLIC_API_VERSION),
      body: JSON.stringify({ inputs: {} }),
    });
    this.pendingExecutions.push({ spaceId, executionId: floorExecutionId });
    const runnerExecutionId = await this.findRunnerExecution({
      spaceId,
      floorExecutionId,
      maxWaitMs,
    });
    if (!runnerExecutionId) {
      this.log.warning(
        `Floor worker execution ${floorExecutionId} did not start a runner; scoring its own execution`
      );
      const polled = await this.poll({ spaceId, executionId: floorExecutionId, maxWaitMs });
      if (isTerminal(polled.execution.status)) this.forget(floorExecutionId);
      return polled;
    }
    this.pendingExecutions.push({ spaceId, executionId: runnerExecutionId });
    const polled = await this.poll({ spaceId, executionId: runnerExecutionId, maxWaitMs });
    if (isTerminal(polled.execution.status)) {
      this.forget(runnerExecutionId);
      this.forget(floorExecutionId);
    }
    return polled;
  }

  private forget(executionId: string): void {
    const index = this.pendingExecutions.findIndex((entry) => entry.executionId === executionId);
    if (index >= 0) this.pendingExecutions.splice(index, 1);
  }

  /** Registers an execution this client did not start (a review) so teardown cancels it. */
  track(spaceId: string, executionId: string): void {
    this.pendingExecutions.push({ spaceId, executionId });
  }

  /**
   * Cancels what is still running, including reviews parked on the analyst gate. Every execution
   * is attempted. A 404 (already gone) is ignored; any other failure is thrown after all attempts
   * finish, naming each execution id and HTTP status (an `AggregateError` when several failed),
   * because a review that could not be cancelled stays parked.
   */
  async cancelPending(): Promise<void> {
    const pending = this.pendingExecutions.splice(0);
    const results = await Promise.allSettled(
      pending.map(({ spaceId, executionId }) =>
        this.fetch(this.executionPath(spaceId, executionId, '/cancel'), {
          method: 'POST',
          headers: apiVersion(PUBLIC_API_VERSION),
        })
      )
    );
    const failures = results.flatMap((result, index) => {
      if (result.status !== 'rejected' || httpStatus(result.reason) === 404) return [];
      const { executionId } = pending[index];
      const message = `Could not cancel execution ${executionId} (HTTP ${
        httpStatus(result.reason) ?? 'unknown'
      }): ${errorMessage(result.reason)}`;
      this.log.warning(message);
      return [new Error(message, { cause: result.reason })];
    });
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      throw new AggregateError(failures, failures.map((failure) => failure.message).join('; '));
    }
  }
}

export const stepsOf = (
  execution: WorkflowExecutionDto,
  stepId: string
): WorkflowStepExecutionDto[] => execution.stepExecutions.filter((step) => step.stepId === stepId);

/**
 * Hands the client to `use`, and cancels whatever is still pending whether `use` ends or throws.
 * A failed cancel is reported too: alone when `use` succeeded, together with `use`'s error (as an
 * `AggregateError`) when both failed, so neither masks the other.
 */
export const usingClient = async (
  client: Pick<AttackDiscoveryWorkerClient, 'cancelPending'>,
  use: () => Promise<void>
): Promise<void> => {
  const errors: unknown[] = [];
  try {
    await use();
  } catch (error) {
    errors.push(error);
  }
  try {
    await client.cancelPending();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, errors.map((error) => errorMessage(error)).join('; '));
  }
};
