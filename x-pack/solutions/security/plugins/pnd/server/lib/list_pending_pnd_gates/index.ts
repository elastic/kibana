/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { readCorrelationIdFromExecutionContext } from '@kbn/workflows/managed';
import { getGateDefinition, PND_WATCH_WORKFLOW_IDS, pndWatchDocumentId } from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../services/watches/watch_workflows_management_client';

/**
 * Upper bound on parked runs read per request (per watch, and in total after merging). The HITL
 * queue is a transient working set — a handful of live incidents — so a single bounded page with no
 * cursor is enough, and it caps the number of per-run `getWorkflowExecution` lookups.
 */
export const PND_PENDING_GATES_MAX_RUNS = 200;

export interface ListPendingPndGatesParams {
  /** Resolve each gate's predecessor `output.reasoning` (constraint C12). Off by default. */
  includeReasoning?: boolean;
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /**
   * When provided, threaded into `getWorkflowExecutions` / `getWorkflowExecution` so the projection
   * asserts managed-execution read from `request.authzResult`. Omit on paths that must not inherit
   * that gate (eager `_ensure` from a Task Manager API key).
   */
  request?: KibanaRequest;
  /** Upper bound on parked runs read; defaults to {@link PND_PENDING_GATES_MAX_RUNS}. */
  size?: number;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
  /** PND managed watch ids to read; defaults to every PND watch. */
  watchIds?: readonly string[];
}

export interface ListPendingPndGatesResult {
  /** `workflowRunId → correlationId` decoded from each parked run's `context.event`. */
  attackDiscoveryIdByRunId: Map<string, string>;
  /** `stepExecutionId → output.reasoning` of the gate's timestamp-predecessor (C12). */
  reasoningByStepId: Map<string, Record<string, unknown>>;
  /**
   * Pending, unanswered `waitForInput` step executions that are **registered PND gates** — every
   * result satisfies `getGateDefinition(workflowId, stepId) != null` (D4).
   */
  results: WorkflowStepExecutionDto[];
}

/** A `waitForInput` step that is still parked and has not been claimed by a response. */
const isPendingWait = (step: WorkflowStepExecutionDto): boolean =>
  step.status === ExecutionStatus.WAITING_FOR_INPUT &&
  step.finishedAt == null &&
  step.hitl?.respondedAt == null;

/**
 * Whether a parked step is one of the four gates in `PND_GATE_REGISTRY`, keyed by
 * `(workflowId, stepId)`.
 *
 * Security finding D4: a PND watch may own `waitForInput` steps that are **not** PND gates —
 * `watch_officer.yaml`'s `await_approval` is exactly that — so restricting the listing to
 * {@link PND_WATCH_WORKFLOW_IDS} is not by itself enough to make every result a gate. Filtering
 * here makes "a result is a registered gate" an invariant of this helper rather than something each
 * consumer must re-establish, which is what let the superset reach callers before.
 */
const isRegisteredPndGate = (step: WorkflowStepExecutionDto, spaceId: string): boolean =>
  getGateDefinition(step.workflowId, step.stepId, spaceId) != null;

/** Pull a plain-object `reasoning` value out of a step output, when present. */
const extractReasoning = (output: unknown): Record<string, unknown> | undefined => {
  if (output == null || typeof output !== 'object' || Array.isArray(output)) {
    return undefined;
  }
  const { reasoning } = output as { reasoning?: unknown };
  if (reasoning == null || typeof reasoning !== 'object' || Array.isArray(reasoning)) {
    return undefined;
  }
  return reasoning as Record<string, unknown>;
};

/** Milliseconds since epoch for an ISO timestamp, or `NaN` when it is missing/unparseable. */
const toTime = (value: string | undefined): number => (value ? Date.parse(value) : NaN);

/** Sort executions newest-first by `startedAt`; missing/unparseable timestamps sort last. */
const byStartedAtDesc = (
  a: WorkflowExecutionListItemDto,
  b: WorkflowExecutionListItemDto
): number => {
  const aTime = toTime(a.startedAt);
  const bTime = toTime(b.startedAt);
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
};

/**
 * Resolve the `output.reasoning` of each pending gate's **timestamp** predecessor within one run.
 *
 * Constraint C12: the predecessor is the completed step with the greatest `finishedAt` at or before
 * the gate's `startedAt` — timestamp order, not graph order — which is why the orchestrator's
 * `data.set` reasoning step lives inside the gate branch.
 */
const resolveReasoningForRun = (
  pending: WorkflowStepExecutionDto[],
  stepExecutions: WorkflowStepExecutionDto[]
): Array<[string, Record<string, unknown>]> => {
  const candidates = stepExecutions
    .filter(
      (step): step is WorkflowStepExecutionDto & { finishedAt: string } =>
        step.status === ExecutionStatus.COMPLETED && typeof step.finishedAt === 'string'
    )
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0));

  return pending.flatMap((step): Array<[string, Record<string, unknown>]> => {
    if (typeof step.startedAt !== 'string') {
      return [];
    }
    const predecessor = candidates.find(({ finishedAt }) => finishedAt <= step.startedAt);
    const reasoning = extractReasoning(predecessor?.output);
    return reasoning == null ? [] : [[step.id, reasoning]];
  });
};

/**
 * List the space's pending PND HITL gates, with their attack-discovery correlation and (optionally)
 * their reasoning.
 *
 * **Why this does not call `listWaitingForInputSteps`** (bead `kibana-idjb.21`): that API filters
 * its results to steps whose parent workflow is "alive **in the same space**"
 * (`getAliveWorkflowIds`). Every PND system watch is a **global** managed workflow stored with
 * `spaceId: '*'`, while its executions and step executions carry the *emitting* space — so the
 * aliveness lookup finds nothing and every PND gate is silently dropped. (This is the exact inverse
 * of C1, where `getWorkflowsSubscribedToTrigger` passes `includeGlobal: true` so a global watch
 * *does* match a trigger emitted in a real space.)
 *
 * Instead the listing starts from the runs: for each PND watch it asks for the executions already
 * parked on an input wait — an execution-document read, which is space-filtered on the *emitting*
 * space and therefore blind to where the workflow itself lives — and then reads each parked run once
 * to project its `stepExecutions`. Restricting to {@link PND_WATCH_WORKFLOW_IDS} is a **stronger**
 * allow-list than "alive in this space", and PND already owns that constant (security finding S1).
 *
 * The single per-run read also carries the run's `context.event`, so the attack-discovery
 * correlation (C6/C7 retrieve-then-filter) comes for free rather than costing a second lookup.
 *
 * Every result is a **registered** PND gate (`getGateDefinition(workflowId, stepId) != null`).
 * Security finding D4: the watch-id allow-list alone returned a superset, because a PND watch may
 * park on a `waitForInput` that is not a gate (`watch_officer.yaml`'s `await_approval`), and only
 * each consumer's own registry check kept it out of the queue. The consumers keep those checks —
 * defense in depth, not redundancy — but the invariant now holds here, so a future caller inherits
 * it instead of having to rediscover it.
 *
 * Read failures **propagate**: an empty HITL queue and a broken HITL queue must not look the same
 * to a caller. Each route decides its own policy at its own boundary — the proposals list and
 * `_auto_respond` surface a 500, while the runs list's gate-count badge degrades to zero.
 */
export const listPendingPndGates = async ({
  includeReasoning = false,
  logger,
  managementClient,
  request,
  size = PND_PENDING_GATES_MAX_RUNS,
  spaceId,
  watchIds = PND_WATCH_WORKFLOW_IDS,
}: ListPendingPndGatesParams): Promise<ListPendingPndGatesResult> => {
  logger.debug(() => `Listing pending PND gates in space "${spaceId}"`);

  const perWatch = await Promise.all(
    watchIds.map(async (workflowId): Promise<WorkflowExecutionListItemDto[]> => {
      const { results } = await managementClient.getWorkflowExecutions(
        {
          page: 1,
          size,
          statuses: [ExecutionStatus.WAITING_FOR_INPUT],
          workflowId: pndWatchDocumentId(workflowId, spaceId),
        },
        spaceId,
        ...(request != null ? [request] : [])
      );
      return results;
    })
  );

  const runIds = Array.from(
    new Set(
      perWatch
        .flat()
        .sort(byStartedAtDesc)
        .slice(0, size)
        .map(({ id }) => id)
    )
  );

  const perRun = await Promise.all(
    runIds.map(
      async (
        runId
      ): Promise<{
        correlationId: string;
        pending: WorkflowStepExecutionDto[];
        reasoning: Array<[string, Record<string, unknown>]>;
        runId: string;
      }> => {
        // `includeInput` is load-bearing: the gate prompt (`with.message` / `with.schema`) is
        // projected from the paused step's `input`, and the read excludes it by default.
        const execution = await managementClient.getWorkflowExecution(runId, spaceId, {
          includeInput: true,
          includeOutput: true,
          ...(request != null ? { request } : {}),
        });
        const stepExecutions = execution?.stepExecutions ?? [];
        // D4: a pending wait is only a PND gate if the registry knows it — see isRegisteredPndGate.
        const pending = stepExecutions.filter(
          (step) => isPendingWait(step) && isRegisteredPndGate(step, spaceId)
        );

        return {
          correlationId: readCorrelationIdFromExecutionContext(execution?.context),
          pending,
          reasoning: includeReasoning ? resolveReasoningForRun(pending, stepExecutions) : [],
          runId,
        };
      }
    )
  );

  // A step execution can only belong to one run, but two listed runs collapsing to the same id
  // (paging overlap) would otherwise duplicate its gates into the queue.
  const byStepExecutionId = new Map(
    perRun.flatMap(({ pending }) =>
      pending.map((step): [string, WorkflowStepExecutionDto] => [step.id, step])
    )
  );

  return {
    attackDiscoveryIdByRunId: new Map(
      perRun.map(({ correlationId, runId }): [string, string] => [runId, correlationId])
    ),
    reasoningByStepId: new Map(perRun.flatMap(({ reasoning }) => reasoning)),
    results: Array.from(byStepExecutionId.values()),
  };
};
