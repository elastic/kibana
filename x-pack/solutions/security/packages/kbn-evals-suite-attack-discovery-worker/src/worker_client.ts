/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeepStrictEqual } from 'util';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type ChildWorkflowExecutionItem,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  FLOOR_IDLE_WAIT_MS,
  FLOOR_TICK_CANCEL_TIMEOUT_MS,
  FLOOR_TICK_POLL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  PUBLIC_API_VERSION,
  REVIEW_WORKFLOW_ID,
  RUNNER_TIMEOUT_MS,
  RUNNER_WORKFLOW_ID,
} from './constants';
import {
  assertFloorClean,
  readFloorWorkflow,
  rewriteFloorParentYaml,
  type FloorWorkflowState,
} from './floor_parent';
import { listActiveExecutionIds } from './floor_worker';
import { apiVersion, errorMessage, httpStatus, sleep, spacePath } from './kibana_api';

const CANCEL_SETTLE_TIMEOUT_MS = FLOOR_TICK_CANCEL_TIMEOUT_MS;
/** A failed cancel is retried once: two attempts in all. */
const MAX_CANCEL_ATTEMPTS = 2;

export const isTerminal = (status: ExecutionStatus): boolean =>
  TerminalExecutionStatuses.includes(status);

/** An execution as last read, and how long the wait was if it ran out before the execution settled. */
export interface PolledExecution {
  execution: WorkflowExecutionDto;
  timedOutAfterMs?: number;
}

/**
 * Starts the per-space floor Attack Discovery worker and reads executions back. The worker
 * dispatches the runner and the review as its service account; the engine refuses a standalone
 * start of a workflow that needs a delegated identity.
 */
export class AttackDiscoveryWorkerClient {
  private readonly pendingExecutions: Array<{ spaceId: string; executionId: string }> = [];
  /** Failed cancels per execution id, so one that keeps failing is retried once, then dropped. */
  private readonly failedCancels = new Map<string, number>();

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
      query: { includeInput: true, includeOutput: true },
    });
  }

  /** Child executions started by `executionId`'s steps, with their step errors (no step I/O). */
  async getChildren(spaceId: string, executionId: string): Promise<ChildWorkflowExecutionItem[]> {
    return this.fetch<ChildWorkflowExecutionItem[]>(
      this.executionPath(spaceId, executionId, '/children'),
      { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
    );
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
    isDone,
  }: {
    spaceId: string;
    executionId: string;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
  }): Promise<PolledExecution> {
    return this.pollUntil({
      spaceId,
      executionId,
      deadline: Date.now() + maxWaitMs,
      maxWaitMs,
      isDone,
    });
  }

  private async pollUntil({
    spaceId,
    executionId,
    deadline,
    maxWaitMs,
    isDone = (execution) => isTerminal(execution.status),
  }: {
    spaceId: string;
    executionId: string;
    /** Absolute time the wait ends; `maxWaitMs` is only what a timeout reports. */
    deadline: number;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
  }): Promise<PolledExecution> {
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
   * Finds the execution of `workflowId` that `parentExecutionId` started, which appears only once
   * the parent's `workflow.execute` step has begun. Undefined when the parent ended without
   * starting one.
   */
  private async findChildExecution({
    spaceId,
    parentExecutionId,
    workflowId,
    deadline,
  }: {
    spaceId: string;
    parentExecutionId: string;
    workflowId: string;
    deadline: number;
  }): Promise<string | undefined> {
    for (;;) {
      const children = await this.getChildren(spaceId, parentExecutionId);
      const child = children.find((candidate) => candidate.workflowId === workflowId);
      if (child) return child.executionId;
      const parent = await this.getExecution(spaceId, parentExecutionId);
      if (isTerminal(parent.status) || Date.now() >= deadline) return undefined;
      await sleep(POLL_INTERVAL_MS);
    }
  }

  /**
   * Runs the floor worker, follows it to the child it dispatches (`childWorkflowId`) and polls that
   * child until `isDone` accepts it or it ends. Finding and polling share one `maxWaitMs` deadline.
   * Once the child has ended the floor gets a further `FLOOR_IDLE_WAIT_MS` to settle, because the
   * engine schedules a parent's resume only after its child ends and the floor stays non-terminal
   * for a moment. A timeout or an execution with no steps is returned, not thrown, so the row is
   * scored instead of vanishing. When the floor ends without starting the child, the floor's own
   * execution is returned. Every execution started is pushed to `started`.
   */
  private async runFloorToChild({
    spaceId,
    floorWorkflowId,
    childWorkflowId,
    childLabel,
    maxWaitMs,
    isDone,
    started,
  }: {
    spaceId: string;
    floorWorkflowId: string;
    childWorkflowId: string;
    childLabel: string;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
    started: string[];
  }): Promise<PolledExecution> {
    const deadline = Date.now() + maxWaitMs;
    const { workflowExecutionId: floorExecutionId } = await this.fetch<{
      workflowExecutionId: string;
    }>(spacePath(spaceId, `/api/workflows/workflow/${encodeURIComponent(floorWorkflowId)}/run`), {
      method: 'POST',
      headers: apiVersion(PUBLIC_API_VERSION),
      body: JSON.stringify({ inputs: {} }),
    });
    started.push(floorExecutionId);
    this.pendingExecutions.push({ spaceId, executionId: floorExecutionId });
    const childExecutionId = await this.findChildExecution({
      spaceId,
      parentExecutionId: floorExecutionId,
      workflowId: childWorkflowId,
      deadline,
    });
    if (!childExecutionId) {
      this.log.warning(
        `Floor worker execution ${floorExecutionId} did not start ${childLabel}; scoring its own execution`
      );
      const polled = await this.pollUntil({
        spaceId,
        executionId: floorExecutionId,
        deadline,
        maxWaitMs,
      });
      if (polled.execution.status === ExecutionStatus.CANCELLED) {
        this.log.warning(
          `Floor worker execution ${floorExecutionId} was cancelled before it dispatched ${childLabel}: the worker's concurrency cancels the run in progress, so another run of the floor worker (a scheduled tick) took its slot`
        );
      }
      if (isTerminal(polled.execution.status)) this.forget(floorExecutionId);
      return polled;
    }
    started.push(childExecutionId);
    this.pendingExecutions.push({ spaceId, executionId: childExecutionId });
    const polled = await this.pollUntil({
      spaceId,
      executionId: childExecutionId,
      deadline,
      maxWaitMs,
      isDone,
    });
    if (isTerminal(polled.execution.status)) {
      this.forget(childExecutionId);
      // The engine only schedules the parent's resume when its child ends, so the floor can still
      // be active here. Leaving it unsettled would make the next floor-parent run see a busy floor.
      // This is housekeeping: a failed read must not discard the finished child's result.
      await this.pollUntil({
        spaceId,
        executionId: floorExecutionId,
        deadline: Date.now() + FLOOR_IDLE_WAIT_MS,
        maxWaitMs: FLOOR_IDLE_WAIT_MS,
      }).then(
        ({ execution: floor }) => {
          if (isTerminal(floor.status)) this.forget(floorExecutionId);
        },
        (error) =>
          this.log.warning(
            `Could not read floor execution ${floorExecutionId} after its child ended: ${errorMessage(
              error
            )}`
          )
      );
    }
    return polled;
  }

  /**
   * Runs the runner through the floor worker within one `RUNNER_TIMEOUT_MS` deadline (see
   * `runFloorToChild`).
   */
  async run({
    spaceId,
    floorWorkflowId,
  }: {
    spaceId: string;
    floorWorkflowId: string;
  }): Promise<PolledExecution> {
    return this.runFloorToChild({
      spaceId,
      floorWorkflowId,
      childWorkflowId: RUNNER_WORKFLOW_ID,
      childLabel: 'a runner',
      maxWaitMs: RUNNER_TIMEOUT_MS,
      started: [],
    });
  }

  /**
   * Runs `targetWorkflowId` as a child of the floor worker and polls it until `isDone` accepts it
   * or it ends. A workflow that inherits its execution identity (the review) is refused with 403
   * when started directly, so the floor is the parent: its stored YAML is rewritten to dispatch the
   * target with literal `inputs`, the floor is run, and the YAML is put back.
   *
   * Only call this while no other floor run is active; the floor and the target get
   * `FLOOR_IDLE_WAIT_MS` to go idle (nothing is cancelled for that); after that only the long
   * schedule interval keeps a tick out (a PUT reschedules the task, it does not run it). The
   * restore re-reads the floor first, but the managed route takes no precondition, so a
   * concurrent edit is detected best-effort, not prevented. When no target starts, the floor's own
   * execution is returned, so the caller checks its `workflowId`.
   */
  async runViaFloorParent({
    spaceId,
    floorWorkflowId,
    targetWorkflowId,
    inputs,
    maxWaitMs,
    isDone,
  }: {
    spaceId: string;
    floorWorkflowId: string;
    targetWorkflowId: string;
    inputs: Record<string, unknown>;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
  }): Promise<PolledExecution> {
    const before = await readFloorWorkflow({ fetch: this.fetch, spaceId, floorWorkflowId });
    // A floor that already dispatches something else is what an interrupted run left; reading it
    // as the original would restore the leftover.
    assertFloorClean(floorWorkflowId, before.yaml);
    const rewrittenYaml = rewriteFloorParentYaml({
      yaml: before.yaml,
      targetWorkflowId,
      inputs,
    });
    // The floor cancels in progress and the rewrite changes what a tick runs, so an execution of
    // either workflow that is still active would be cancelled or run on the wrong definition.
    await this.waitForIdle(spaceId, [floorWorkflowId, targetWorkflowId]);

    const errors: unknown[] = [];
    const started: string[] = [];
    let polled: PolledExecution | undefined;
    // What the rewrite left stored, when it could be read back.
    let rewritten: FloorWorkflowState | undefined;
    try {
      await this.putFloorYaml(spaceId, floorWorkflowId, rewrittenYaml);
      rewritten = await readFloorWorkflow({ fetch: this.fetch, spaceId, floorWorkflowId });
      polled = await this.runFloorToChild({
        spaceId,
        floorWorkflowId,
        childWorkflowId: targetWorkflowId,
        childLabel: `"${targetWorkflowId}"`,
        maxWaitMs,
        isDone,
        started,
      });
    } catch (error) {
      errors.push(error);
    }
    // Everything this call started is cancelled before the YAML is put back, so no execution of
    // the floor or its child is still running on the rewritten definition (or racing the restore).
    // A review parked at the analyst gate is cancelled too: the returned snapshot is what is scored.
    try {
      await this.cancelExecutions(spaceId, started);
    } catch (error) {
      errors.push(error);
    }
    try {
      // The managed PUT is a blind write. The floor must still be what this call left (or, when
      // the rewrite PUT failed, what it found), or the restore would overwrite someone else's edit.
      const current = await readFloorWorkflow({ fetch: this.fetch, spaceId, floorWorkflowId });
      const changed = describeConcurrentChange({ current, rewritten, rewrittenYaml, before });
      if (changed) {
        throw new Error(
          `floor changed concurrently during the floor-parent run; not restored (${changed})`
        );
      }
      await this.putFloorYaml(spaceId, floorWorkflowId, before.yaml);
      const after = await readFloorWorkflow({ fetch: this.fetch, spaceId, floorWorkflowId });
      const drift = describeFloorDrift(before, after);
      if (drift) throw new Error(drift);
    } catch (error) {
      errors.push(
        new Error(
          `Could not restore floor workflow "${floorWorkflowId}" after a floor-parent run: ${errorMessage(
            error
          )}`,
          { cause: error }
        )
      );
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, errors.map((error) => errorMessage(error)).join('; '));
    }
    if (!polled) throw new Error('Floor-parent run ended without a result.');
    return polled;
  }

  /** Waits, within one `FLOOR_IDLE_WAIT_MS`, for the workflows to have no active execution. */
  private async waitForIdle(spaceId: string, workflowIds: string[]): Promise<void> {
    const deadline = Date.now() + FLOOR_IDLE_WAIT_MS;
    for (const workflowId of new Set(workflowIds)) {
      let active = await listActiveExecutionIds(this.fetch, spaceId, workflowId);
      if (active.length > 0) {
        this.log.info(`Waiting for "${workflowId}" to go idle (${active.join(', ')})`);
      }
      while (active.length > 0 && Date.now() < deadline) {
        await sleep(FLOOR_TICK_POLL_INTERVAL_MS);
        active = await listActiveExecutionIds(this.fetch, spaceId, workflowId);
      }
      if (active.length > 0) {
        throw new Error(
          `Workflow "${workflowId}" has active executions (${active.join(
            ', '
          )}); a floor-parent run needs the floor and its child idle.`
        );
      }
    }
  }

  private async putFloorYaml(
    spaceId: string,
    floorWorkflowId: string,
    yaml: string
  ): Promise<void> {
    // The managed route is the one that accepts a managed workflow; it needs `updateManaged`.
    await this.fetch(
      spacePath(spaceId, `/api/workflows/managed/workflow/${encodeURIComponent(floorWorkflowId)}`),
      {
        method: 'PUT',
        headers: apiVersion(PUBLIC_API_VERSION),
        body: JSON.stringify({ yaml }),
      }
    );
  }

  /**
   * Reviews one attack discovery via `runViaFloorParent` until it ends or parks at the analyst
   * gate. `isDone` is passed in because importing it here would be a cycle.
   */
  async runReview({
    spaceId,
    floorWorkflowId,
    attackDiscoveryId,
    title,
    maxWaitMs,
    isDone,
  }: {
    spaceId: string;
    floorWorkflowId: string;
    attackDiscoveryId: string;
    title: string;
    maxWaitMs: number;
    isDone?: (execution: WorkflowExecutionDto) => boolean;
  }): Promise<PolledExecution> {
    return this.runViaFloorParent({
      spaceId,
      floorWorkflowId,
      targetWorkflowId: REVIEW_WORKFLOW_ID,
      inputs: { attack_discovery_id: attackDiscoveryId, title },
      maxWaitMs,
      isDone,
    });
  }

  private forget(executionId: string): void {
    const index = this.pendingExecutions.findIndex((entry) => entry.executionId === executionId);
    if (index >= 0) this.pendingExecutions.splice(index, 1);
    this.failedCancels.delete(executionId);
  }

  /** Registers an execution this client did not start (a review) so teardown cancels it. */
  track(spaceId: string, executionId: string): void {
    this.pendingExecutions.push({ spaceId, executionId });
  }

  /**
   * Cancels what is still running, including reviews parked on the analyst gate. Every execution
   * is attempted. A 404 (already gone) is ignored; any other failure is thrown after all attempts
   * finish, naming each execution id and HTTP status (an `AggregateError` when several failed),
   * because a review that could not be cancelled stays parked. A failed execution stays pending for
   * one retry on a later call; if that fails too it is dropped with a warning, so a review that
   * cannot be cancelled does not fail every later row.
   */
  async cancelPending(): Promise<void> {
    await this.cancelEntries(this.pendingExecutions.splice(0));
  }

  /**
   * Cancels those of the given executions that have not ended (the route may refuse an ended one),
   * then waits a bounded time for them to end. Failures follow `cancelPending`'s contract.
   */
  private async cancelExecutions(spaceId: string, executionIds: string[]): Promise<void> {
    for (const executionId of executionIds) this.forget(executionId);
    const live = (
      await Promise.all(
        executionIds.map(async (executionId) => {
          const status = await this.getExecution(spaceId, executionId).then(
            ({ status: current }) => current,
            (error) => (httpStatus(error) === 404 ? ExecutionStatus.CANCELLED : undefined)
          );
          return status !== undefined && isTerminal(status) ? [] : [executionId];
        })
      )
    ).flat();
    await this.cancelEntries(live.map((executionId) => ({ spaceId, executionId })));
    await Promise.all(live.map((executionId) => this.waitUntilSettled(spaceId, executionId)));
  }

  /** Waits a bounded time for a cancelled execution to end; a 404 or a timeout only warns. */
  private async waitUntilSettled(spaceId: string, executionId: string): Promise<void> {
    const deadline = Date.now() + CANCEL_SETTLE_TIMEOUT_MS;
    for (;;) {
      const status = await this.getExecution(spaceId, executionId).then(
        ({ status: current }) => current,
        (error) => (httpStatus(error) === 404 ? ExecutionStatus.CANCELLED : undefined)
      );
      if (status !== undefined && isTerminal(status)) return;
      if (Date.now() >= deadline) {
        this.log.warning(
          `Execution ${executionId} had not ended ${CANCEL_SETTLE_TIMEOUT_MS}ms after it was cancelled`
        );
        return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  private async cancelEntries(
    pending: Array<{ spaceId: string; executionId: string }>
  ): Promise<void> {
    const results = await Promise.allSettled(
      pending.map(({ spaceId, executionId }) =>
        this.fetch(this.executionPath(spaceId, executionId, '/cancel'), {
          method: 'POST',
          headers: apiVersion(PUBLIC_API_VERSION),
        })
      )
    );
    const failures = results.flatMap((result, index) => {
      if (result.status !== 'rejected' || httpStatus(result.reason) === 404) {
        this.failedCancels.delete(pending[index].executionId);
        return [];
      }
      const { spaceId, executionId } = pending[index];
      const failedCancels = (this.failedCancels.get(executionId) ?? 0) + 1;
      if (failedCancels < MAX_CANCEL_ATTEMPTS) {
        this.failedCancels.set(executionId, failedCancels);
        this.track(spaceId, executionId);
      } else {
        this.failedCancels.delete(executionId);
        this.log.warning(
          `Giving up on cancelling execution ${executionId} after ${failedCancels} attempts: ${errorMessage(
            result.reason
          )}`
        );
      }
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

/**
 * What about the floor read just before the restore is not what this run left, or undefined when
 * it is. Without the post-rewrite state (its read failed), the stored text must be the one written
 * (or the original, if the rewrite PUT never landed) and `enabled` unchanged, else it fails closed.
 * Text is what can be compared there: the server bumps `version` only when the trimmed YAML
 * changes.
 */
const describeConcurrentChange = ({
  current,
  rewritten,
  rewrittenYaml,
  before,
}: {
  current: FloorWorkflowState;
  rewritten: FloorWorkflowState | undefined;
  rewrittenYaml: string;
  before: FloorWorkflowState;
}): string | undefined => {
  const text = current.yaml.trim();
  const differing = rewritten
    ? [
        ...(text === rewritten.yaml.trim() ? [] : ['yaml']),
        ...(current.version === rewritten.version ? [] : ['version']),
        ...(isDeepStrictEqual(current.definition, rewritten.definition) ? [] : ['definition']),
        ...(current.enabled === rewritten.enabled ? [] : ['enabled']),
      ]
    : [
        ...(text === rewrittenYaml.trim() || text === before.yaml.trim() ? [] : ['yaml']),
        ...(current.enabled === before.enabled ? [] : ['enabled']),
      ];
  return differing.length > 0 ? differing.join(', ') : undefined;
};

/**
 * What differs between the floor as it was read before a floor-parent run and as it is after the
 * restore, or undefined when the stored definition and the managed state (what the server's drift
 * status derives from) match. The YAML text is not compared (the server stores the parsed
 * definition); `version` is excluded because the restore PUT itself moves it.
 */
export const describeFloorDrift = (
  before: FloorWorkflowState,
  after: FloorWorkflowState
): string | undefined => {
  const differing = [
    ...(isDeepStrictEqual(before.definition, after.definition) ? [] : ['definition']),
    ...(before.enabled === after.enabled ? [] : ['enabled']),
    ...(before.definitionHash === after.definitionHash ? [] : ['definitionHash']),
    ...(before.managedVersion === after.managedVersion ? [] : ['managedVersion']),
    ...(before.originManagedWorkflowId === after.originManagedWorkflowId
      ? []
      : ['originManagedWorkflowId']),
  ];
  return differing.length > 0
    ? `the floor workflow differs from before the run after the restore (${differing.join(', ')}).`
    : undefined;
};

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
