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

export interface RunnerInputs {
  schedule_interval: string;
  autonomy: 'manual' | 'supervised';
  connector_id?: string;
  max_alerts?: number;
}

/**
 * Triggers the Attack Discovery runner directly in a space and reads executions back. The
 * runner is a global workflow whose only trigger is manual, so it needs no per-space Worker.
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
   * Runs the runner to completion. A timeout or an execution with no steps is returned, not
   * thrown, so the row is scored (and fails by name) instead of vanishing from the results.
   */
  async run({
    spaceId,
    inputs,
    maxWaitMs = RUNNER_TIMEOUT_MS,
  }: {
    spaceId: string;
    inputs: RunnerInputs;
    maxWaitMs?: number;
  }): Promise<PolledExecution> {
    const { workflowExecutionId } = await this.fetch<{ workflowExecutionId: string }>(
      spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(RUNNER_WORKFLOW_ID)}/run`),
      {
        method: 'POST',
        headers: apiVersion(PUBLIC_API_VERSION),
        body: JSON.stringify({ inputs }),
      }
    );
    this.pendingExecutions.push({ spaceId, executionId: workflowExecutionId });
    const polled = await this.poll({ spaceId, executionId: workflowExecutionId, maxWaitMs });
    if (isTerminal(polled.execution.status)) {
      this.forget(workflowExecutionId);
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
