/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { readCorrelationIdFromExecutionContext } from '@kbn/workflows/managed';
import { getGateDefinition, PND_WATCH_WORKFLOW_IDS, pndWatchDocumentId } from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../services/watches/watch_workflows_management_client';
import { extractGateAnswer, type GateAnswer } from '../extract_gate_answer';

/**
 * Upper bound on runs read per request. Lower than the queue's bound on purpose: the queue reads only
 * *parked* runs (a handful of live incidents), while the history has to read runs in **every** status
 * to find gates that were already answered, and each run costs one `getWorkflowExecution`.
 */
export const PND_ANSWERED_GATES_MAX_RUNS = 50;

export interface ListAnsweredPndGatesParams {
  logger: Logger;
  managementClient: WatchWorkflowsManagementClient;
  /** Upper bound on runs read; defaults to {@link PND_ANSWERED_GATES_MAX_RUNS}. */
  size?: number;
  /** Space resolved from the request (security finding S9); never a client value, never `'*'`. */
  spaceId: string;
  /** PND managed watch ids to read; defaults to every PND watch. */
  watchIds?: readonly string[];
}

export interface ListAnsweredPndGatesResult {
  /** `stepExecutionId → how that gate was answered`. */
  answerByStepId: Map<string, GateAnswer>;
  /** `workflowRunId → correlationId` decoded from each run's `context.event`. */
  attackDiscoveryIdByRunId: Map<string, string>;
  /** `stepExecutionId → output.reasoning` of the gate's timestamp-predecessor (C12). */
  reasoningByStepId: Map<string, Record<string, unknown>>;
  /** Answered `waitForInput` step executions that are **registered PND gates** (D4). */
  results: WorkflowStepExecutionDto[];
}

/** Whether a step is one of the gates in `PND_GATE_REGISTRY`, keyed by `(workflowId, stepId)`. */
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

/** Milliseconds since epoch for an ISO timestamp, or `NaN` when missing/unparseable. */
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
 * Resolve the `output.reasoning` of each gate's **timestamp** predecessor within one run (C12): the
 * completed step with the greatest `finishedAt` at or before the gate's `startedAt`.
 */
const resolveReasoningForRun = (
  gates: WorkflowStepExecutionDto[],
  stepExecutions: WorkflowStepExecutionDto[]
): Array<[string, Record<string, unknown>]> => {
  const candidates = stepExecutions
    .filter(
      (step): step is WorkflowStepExecutionDto & { finishedAt: string } =>
        step.status === ExecutionStatus.COMPLETED && typeof step.finishedAt === 'string'
    )
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0));

  return gates.flatMap((step): Array<[string, Record<string, unknown>]> => {
    if (typeof step.startedAt !== 'string') {
      return [];
    }
    const predecessor = candidates.find(
      ({ finishedAt, id }) => id !== step.id && finishedAt <= step.startedAt
    );
    const reasoning = extractReasoning(predecessor?.output);
    return reasoning == null ? [] : [[step.id, reasoning]];
  });
};

/**
 * List the space's **answered** PND HITL gates, with their attack-discovery correlation, their
 * reasoning, and how each one was answered.
 *
 * The mirror image of `listPendingPndGates`, and it starts from the runs for the same reason that one
 * does (bead `kibana-idjb.21`): `listWaitingForInputSteps` filters to workflows alive *in the calling
 * space*, and every PND watch is a global (`spaceId: '*'`) managed workflow, so that API sees none of
 * them. Two differences follow from reading history rather than a working set:
 *
 * - **no status filter.** A gate that was answered lives in a run that has since completed, failed, or
 *   parked on a *later* gate, so filtering runs by status would hide exactly the gates being looked
 *   for. The watch-id allow-list ({@link PND_WATCH_WORKFLOW_IDS}) still bounds what is read.
 * - **a smaller run cap.** Every listed run costs one `getWorkflowExecution`, and unlike the queue
 *   this listing cannot lean on the engine having already narrowed the set to parked runs.
 *
 * Every result is a **registered** gate (`getGateDefinition(workflowId, stepId) != null`), so a
 * `waitForInput` that is not a PND gate — `watch_officer.yaml`'s `await_approval` — cannot become an
 * audit row (security finding D4). Read failures **propagate**: an empty history and a broken history
 * must not look the same to a caller.
 */
export const listAnsweredPndGates = async ({
  logger,
  managementClient,
  size = PND_ANSWERED_GATES_MAX_RUNS,
  spaceId,
  watchIds = PND_WATCH_WORKFLOW_IDS,
}: ListAnsweredPndGatesParams): Promise<ListAnsweredPndGatesResult> => {
  logger.debug(() => `Listing answered PND gates in space "${spaceId}"`);

  const perWatch = await Promise.all(
    watchIds.map(async (workflowId): Promise<WorkflowExecutionListItemDto[]> => {
      const { results } = await managementClient.getWorkflowExecutions(
        { page: 1, size, workflowId: pndWatchDocumentId(workflowId, spaceId) },
        spaceId
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
        answers: Array<[string, GateAnswer]>;
        correlationId: string;
        gates: WorkflowStepExecutionDto[];
        reasoning: Array<[string, Record<string, unknown>]>;
        runId: string;
      }> => {
        // `includeInput` is load-bearing: the gate prompt (`with.message` / `with.schema`) is
        // projected from the step's `input`, and the read excludes it by default. `includeOutput`
        // carries the resume payload the decision and rationale are read from.
        const execution = await managementClient.getWorkflowExecution(runId, spaceId, {
          includeInput: true,
          includeOutput: true,
        });
        const stepExecutions = execution?.stepExecutions ?? [];

        const answered = stepExecutions.flatMap(
          (step): Array<[WorkflowStepExecutionDto, GateAnswer]> => {
            if (!isRegisteredPndGate(step, spaceId)) {
              return [];
            }
            const answer = extractGateAnswer(step);
            return answer == null ? [] : [[step, answer]];
          }
        );

        const gates = answered.map(([step]) => step);

        return {
          answers: answered.map(([step, answer]): [string, GateAnswer] => [step.id, answer]),
          correlationId: readCorrelationIdFromExecutionContext(execution?.context),
          gates,
          reasoning: resolveReasoningForRun(gates, stepExecutions),
          runId,
        };
      }
    )
  );

  // A step execution belongs to one run, but two listed runs collapsing to the same id (paging
  // overlap) would otherwise duplicate its gates into the history.
  const byStepExecutionId = new Map(
    perRun.flatMap(({ gates }) =>
      gates.map((step): [string, WorkflowStepExecutionDto] => [step.id, step])
    )
  );

  return {
    answerByStepId: new Map(perRun.flatMap(({ answers }) => answers)),
    attackDiscoveryIdByRunId: new Map(
      perRun.map(({ correlationId, runId }): [string, string] => [runId, correlationId])
    ),
    reasoningByStepId: new Map(perRun.flatMap(({ reasoning }) => reasoning)),
    results: Array.from(byStepExecutionId.values()),
  };
};
