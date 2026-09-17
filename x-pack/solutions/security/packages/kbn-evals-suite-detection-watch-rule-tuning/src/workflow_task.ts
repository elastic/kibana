/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import {
  TerminalExecutionStatuses,
  NonTerminalExecutionStatuses,
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
  type WorkflowExecutionListItemDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  RULE_TUNING_WORKER_WORKFLOW_ID,
  RULE_TUNING_REVIEW_WORKFLOW_ID,
  WORKFLOWS_API_VERSION,
  type ChangeType,
} from './constants';

/**
 * The `ai.agent` step (diagnose_rule) whose structured output we grade. Matched on
 * `stepType` so the harness survives step renames in the workflow definition.
 */
const AGENT_STEP_TYPE = 'ai.agent';

/** One item of the `exception` branch's `exception_entries` (see the item union in the yaml). */
export interface ExceptionEntry {
  field: string;
  operator: string;
  /** Required by the is / is_not / matches / does_not_match operators. */
  value?: string;
  /** Required by the is_one_of / is_not_one_of operators. */
  values?: string[];
}

/**
 * Structured output the diagnose step is schema-constrained to return. The review
 * workflow declares a root `oneOf` of four const-branched objects (upstream
 * #288807), so only the fields of the emitted branch are populated: `exception`
 * carries `exception_entries`, `query` carries `proposed_query`, `risk_score`
 * carries `proposed_risk_score` + `proposed_severity`, and `manual` carries
 * nothing but the `summary` every branch requires.
 */
export interface RuleTuningProposal {
  change_type?: ChangeType;
  summary?: string;
  exception_entries?: ExceptionEntry[];
  proposed_query?: string;
  proposed_risk_score?: number;
  proposed_severity?: string;
}

/** Verdict graded by the suite's evaluators: the diagnose proposal plus run metadata. */
export interface RuleTuningVerdict extends RuleTuningProposal {
  executionId: string;
  executionStatus: ExecutionStatus;
  /**
   * Review execution's trace id. Stage-1 join key for the trace-based
   * evaluators (src/evaluators/tool_routing.ts): the tuning review runs as its
   * own workflow execution, so its agent spans hang under this root span, not
   * under the worker sweep's.
   */
  traceId?: string;
  /**
   * The review's step executions. Carries the diagnose step's output, whose
   * persisted `conversation_id` is the stage-2 join key — Agent Builder can fork
   * its own root trace for the step's conversation, which leaves the trace-id
   * join with zero TOOL spans.
   */
  stepExecutions?: WorkflowStepExecutionDto[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

/** GET params shared by every executions-list poll below. */
const nonTerminalQuery = { statuses: [...NonTerminalExecutionStatuses] };

/**
 * True while a REVIEW child execution is parked on its review_tuning
 * human-approval gate.
 *
 * The gate reports `waiting_for_input`, not `waiting` — an earlier bare-string check for
 * 'waiting' alone never matched, so every run sat at the gate until the next task's
 * stale-cancel killed it and no fixture ever scored. Exported so a test pins the contract.
 */
export const isAwaitingApproval = (status: ExecutionStatus): boolean =>
  status === ExecutionStatus.WAITING_FOR_INPUT || status === ExecutionStatus.WAITING;

/**
 * True for the 409 the resume route returns when an execution has reached `waiting_for_input`
 * but its waiting STEP row is not queryable yet.
 *
 * `resumeWorkflowExecution` resolves the waiting step via `getWaitingStepExecutionId` and
 * rejects with `is in status "waiting step not found" but expected "waiting_for_input"` when
 * that lookup comes back empty. That is a read-after-write race the harness should re-poll
 * through, not a real conflict — so this stays narrow. An "already responded to" 409 (a genuine
 * double-approval) does NOT match and still fails the run.
 */
export const isWaitingStepNotReady = (error: unknown): boolean =>
  /waiting step not found/.test(String((error as { message?: unknown })?.message ?? error));

/**
 * True for executions the runtime never actually ran — dropped by a concurrency
 * group or cancelled. Scoring these 0 would report an infrastructure collision as a
 * model failure.
 */
export const neverRan = (status: ExecutionStatus): boolean =>
  status === ExecutionStatus.SKIPPED || status === ExecutionStatus.CANCELLED;

/**
 * List non-terminal executions of one workflow.
 */
const listActiveExecutions = async (
  fetch: HttpHandler,
  workflowId: string
): Promise<WorkflowExecutionListDto> =>
  (await fetch(`/api/workflows/workflow/${workflowId}/executions`, {
    method: 'GET',
    version: WORKFLOWS_API_VERSION,
    headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    query: nonTerminalQuery,
  })) as unknown as WorkflowExecutionListDto;

/**
 * Polls until a workflow has no non-terminal executions left.
 *
 * `/executions/cancel` returns before the runtime has actually torn the executions down,
 * and both the worker and its review children are concurrency-limited — scheduling into a
 * non-drained backlog gets the new run SKIPPED, which reads downstream as a legitimate
 * 0 score.
 */
const waitForNoActiveExecutions = async ({
  fetch,
  log,
  workflowId,
  pollIntervalMs,
  timeoutMs = 60_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  workflowId: string;
  pollIntervalMs: number;
  timeoutMs?: number;
}): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { results = [] } = await listActiveExecutions(fetch, workflowId);
    if (results.length === 0) return;
    await sleep(pollIntervalMs);
  }
  log.warning(`Stale executions still active after ${timeoutMs}ms; scheduling anyway`);
};

const readDiagnoseStructuredOutput = (
  stepExecutions: WorkflowStepExecutionDto[]
): RuleTuningProposal | undefined => {
  const agentSteps = stepExecutions.filter((step) => step.stepType === AGENT_STEP_TYPE);
  for (const step of agentSteps) {
    const output = step.output as { structured_output?: RuleTuningProposal } | null | undefined;
    if (output?.structured_output) {
      return output.structured_output;
    }
  }
  return undefined;
};

/**
 * Explain why a completed REVIEW execution produced no proposal.
 *
 * Two causes are indistinguishable in the score (both yield 0) but demand opposite responses:
 * an agent step that ran out of time is a real model result, while a rule that failed the
 * diagnose gate is a fixture bug. The step list already carries the distinction, so classify it
 * here instead of asserting one cause and sending the reader to check the wrong thing.
 */
export const explainMissingProposal = (
  steps: Array<{ stepId: string; stepType?: string }>
): string => {
  const stepsRun = steps.map((s) => `${s.stepId}(${s.stepType})`).join(', ');
  const cause = steps.some((s) => s.stepType === 'step_level_timeout')
    ? `diagnose_rule hit its step timeout before proposing — the model was too slow to decide, not a seeding failure`
    : `diagnose_rule produced no proposal — the seeded rule likely failed the diagnose gate (check it is enabled)`;
  return `${cause}. Steps that ran: [${stepsRun}]`;
};

const getExecution = async (
  fetch: HttpHandler,
  executionId: string
): Promise<WorkflowExecutionDto> =>
  (await fetch(`/api/workflows/executions/${executionId}`, {
    method: 'GET',
    version: WORKFLOWS_API_VERSION,
    headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    query: { includeOutput: true },
  })) as unknown as WorkflowExecutionDto;

/**
 * Respond to one review child's gate with the given decision, retrying the 409
 * waiting-step race.
 *
 * The child reaching `waiting_for_input` does not guarantee its waiting STEP row is
 * queryable yet; `resumeWorkflowExecution` then rejects with 409 `waiting step not
 * found` — a read-after-write race, not a real conflict. Re-poll through it. A genuine
 * double-approval 409 does not match `isWaitingStepNotReady` and still throws.
 *
 * `approved` is the arm under test: the review's apply steps interpolate the same payload
 * (`steps.review_tuning.output.response.approved`) that an analyst's inbox decision sends,
 * so a reject here is byte-identical to a user clicking Dismiss.
 */
const resumeApprovalGate = async (
  fetch: HttpHandler,
  log: ToolingLog,
  executionId: string,
  pollIntervalMs: number,
  approved: boolean
): Promise<boolean> => {
  try {
    await fetch(`/api/workflows/executions/${executionId}/resume`, {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({ input: { approved } }),
    });
    log.info(
      `Responded approved=${approved} to the review_tuning gate of review execution ${executionId}`
    );
    return true;
  } catch (error) {
    if (!isWaitingStepNotReady(error)) {
      throw error;
    }
    log.info(
      `Approval gate for review execution ${executionId} is not resumable yet ` +
        `(waiting step not persisted); retrying after ${pollIntervalMs}ms`
    );
    await sleep(pollIntervalMs);
    return false;
  }
};

/**
 * Cancel every non-terminal execution of the worker and of its review children.
 *
 * `/executions/cancel` returns before the runtime has actually torn the executions down,
 * and both workflows are concurrency-limited — scheduling into a non-drained backlog gets a
 * new run SKIPPED, which reads downstream as a legitimate 0 score. A leftover review is
 * also not ours to decide, so both flows start from a clean slate.
 */
const cancelStaleExecutions = async ({
  fetch,
  log,
  pollIntervalMs,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  pollIntervalMs: number;
}): Promise<void> => {
  for (const workflowId of [RULE_TUNING_WORKER_WORKFLOW_ID, RULE_TUNING_REVIEW_WORKFLOW_ID]) {
    const stale = await listActiveExecutions(fetch, workflowId);
    if ((stale.results ?? []).length > 0) {
      // Route cancels ALL active executions of this workflow (no body needed).
      await fetch(`/api/workflows/workflow/${workflowId}/executions/cancel`, {
        method: 'POST',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      });
      log.info(
        `Cancelled ${stale.results.length} stale non-terminal execution(s) of ${workflowId} before scheduling`
      );
      await waitForNoActiveExecutions({ fetch, log, workflowId, pollIntervalMs });
    }
  }
};

/**
 * Start the worker sweep. `min_fp_count: 2` is the schema floor (a 1-alert group returns
 * `alert_ids` as a scalar and fails the review's array input); 2 keeps every seeded cluster
 * harvested. The old `concurrency_key` input belonged to the unified workflow and has no
 * post-split meaning.
 */
const startWorkerSweep = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<{ workflowExecutionId: string; startedAt: number }> => {
  const startedAt = Date.now();
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${RULE_TUNING_WORKER_WORKFLOW_ID}/run`,
    {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({
        inputs: { min_fp_count: 2 },
      }),
    }
  )) as { workflowExecutionId: string };
  log.info(`Started rule-tuning worker execution ${workflowExecutionId}`);
  return { workflowExecutionId, startedAt };
};

/**
 * Review children this run opened (started at/after our worker run). Older reviews were
 * cancelled by `cancelStaleExecutions`, so anything newer belongs to this fixture.
 */
const findReviewChildrenSince = async (
  fetch: HttpHandler,
  startedAt: number
): Promise<WorkflowExecutionListItemDto[]> => {
  const { results = [] } = (await fetch(
    `/api/workflows/workflow/${RULE_TUNING_REVIEW_WORKFLOW_ID}/executions`,
    {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { statuses: [...TerminalExecutionStatuses, ...NonTerminalExecutionStatuses] },
    }
  )) as unknown as WorkflowExecutionListDto;
  return results.filter((r) => Date.parse(r.startedAt) >= startedAt);
};

/** The failure text for a sweep that settled without opening a review child. */
const noReviewChildError = (workflowExecutionId: string, workerStatus: ExecutionStatus): Error =>
  new Error(
    `Worker execution ${workflowExecutionId} settled (status: ${workerStatus}) but opened no ` +
      `review children — the seeded rule was not harvested. Check seed_fp_cluster tags/index and ` +
      `that the rule is enabled.`
  );

/**
 * The sweep's review child, or `undefined` while the sweep is still coming up.
 *
 * A just-scheduled sweep is `pending` until the runtime picks it up (seconds), and only
 * then can its harvest step open a child — so an empty child list read while the worker is
 * non-terminal is NOT evidence of a failed harvest. Treating it as one made every run of
 * the approval-gate spec fail on its first poll with `status: pending`, and the spec's own
 * `afterEach` then swept the seeded alerts before the sweep's harvest ever ran, so the
 * failure text blamed a seeding bug that did not exist. Only a SETTLED worker with no
 * child means the rule was not harvested.
 *
 * More than one child is always fatal — it means the cancel pass missed something or the
 * stack is shared — and is reported as such rather than as a seeding problem.
 */
const soleReviewChild = async ({
  fetch,
  workflowExecutionId,
  workerStatus,
  startedAt,
}: {
  fetch: HttpHandler;
  workflowExecutionId: string;
  workerStatus: ExecutionStatus;
  startedAt: number;
}): Promise<WorkflowExecutionListItemDto | undefined> => {
  const reviewChildren = await findReviewChildrenSince(fetch, startedAt);

  if (reviewChildren.length > 1) {
    throw new Error(
      `Expected exactly 1 review child from the seeded fixture, found ${reviewChildren.length}: ` +
        `${reviewChildren.map((r) => `${r.id}@${r.status}`).join(', ')}`
    );
  }
  if (reviewChildren.length === 0) {
    if (!isTerminal(workerStatus)) {
      return undefined;
    }
    throw noReviewChildError(workflowExecutionId, workerStatus);
  }
  return reviewChildren[0];
};

/** The seeded fixture must fan out exactly one review; anything else poisons attribution. */
const assertSoleReviewChild = async ({
  fetch,
  workflowExecutionId,
  workerStatus,
  startedAt,
}: {
  fetch: HttpHandler;
  workflowExecutionId: string;
  workerStatus: ExecutionStatus;
  startedAt: number;
}): Promise<WorkflowExecutionListItemDto> => {
  const child = await soleReviewChild({ fetch, workflowExecutionId, workerStatus, startedAt });
  if (!child) {
    throw noReviewChildError(workflowExecutionId, workerStatus);
  }
  return child;
};

/**
 * The diagnose proposal the review is holding, or a loud failure that names which of the
 * two indistinguishable causes (agent step timeout vs. a rule that failed the diagnose gate)
 * actually happened. Either way there is nothing to approve or reject, so no arm can run.
 */
const readProposalOrThrow = (review: WorkflowExecutionDto): RuleTuningProposal => {
  const proposal = readDiagnoseStructuredOutput(review.stepExecutions);
  if (!proposal?.change_type) {
    throw new Error(
      `Review execution ${review.id} (status: ${review.status}) produced no diagnose ` +
        `proposal — ${explainMissingProposal(review.stepExecutions ?? [])}`
    );
  }
  return proposal;
};

/**
 * PORTED 2026-09-11 for the post-#290097 split architecture. The fork harness
 * ran the old unified `system-security-rule-tuning` workflow; main splits it
 * into a worker sweep that fans out one review child per rule. New flow:
 *
 *  1. cancel stale worker+review executions (their inputs are not ours; a
 *     leftover non-terminal review also re-harvests nothing but blocks nothing
 *     — cancel anyway so the run starts from a clean slate),
 *  2. run the WORKER with min_fp_count at the schema floor so the seeded rule is harvested,
 *  3. while the worker is in flight, discover its review CHILD executions
 *     (workflow-id = review, non-terminal, started after our worker run) and
 *     auto-approve each child's waitForApproval gate exactly like the external
 *     resume URL does ({ approved: true }),
 *  4. once the worker settles, grade the diagnose_rule structured_output from
 *     the (single, seeded) review child's stepExecutions.
 */
export const runRuleTuningWorkflow = async ({
  fetch,
  log,
  maxWaitMs = 12 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  /**
   * No connector pinning post-split: the worker's manual-trigger schema is
   * `additionalProperties: false` with no connector input (the fork's unified
   * workflow had one). The review's ai.agent step resolves the space-default
   * connector — same contract as the merged rule-creation suite, where the
   * multi-model matrix is driven by the stack's connector configuration.
   */
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<RuleTuningVerdict> => {
  await cancelStaleExecutions({ fetch, log, pollIntervalMs });
  const { workflowExecutionId, startedAt } = await startWorkerSweep({ fetch, log });

  const deadline = Date.now() + maxWaitMs;
  let worker: WorkflowExecutionDto | undefined;
  /** Review executions we have already approved, so a re-poll cannot double-approve. */
  const approvedReviews = new Set<string>();

  while (Date.now() < deadline) {
    worker = await getExecution(fetch, workflowExecutionId);
    if (isTerminal(worker.status)) break;

    // Discover review children parked on their approval gates and approve them.
    // Reviews are keyed `rule-tuning-review-<rule_uuid>` (max:1, drop), so an
    // un-approved review also blocks any later sweep from re-opening that rule's
    // gate — approve, don't leave parked.
    const activeReviews = await listActiveExecutions(fetch, RULE_TUNING_REVIEW_WORKFLOW_ID);
    for (const review of activeReviews.results ?? []) {
      if (!approvedReviews.has(review.id) && isAwaitingApproval(review.status)) {
        const resumed = await resumeApprovalGate(fetch, log, review.id, pollIntervalMs, true);
        if (resumed) approvedReviews.add(review.id);
      }
    }

    await sleep(pollIntervalMs);
  }

  if (!worker) {
    throw new Error(`No execution returned for worker run ${workflowExecutionId}`);
  }

  if (!isTerminal(worker.status)) {
    log.warning(
      `Worker execution ${workflowExecutionId} did not reach a terminal status within ${maxWaitMs}ms (last status: ${worker.status})`
    );
  }

  // A run the runtime never executed (skipped by concurrency, or cancelled) carries no
  // review at all. Scoring it 0 would report an infrastructure collision as a model
  // failure, so fail loudly instead — an accurate low score is only meaningful if the
  // run actually ran.
  if (neverRan(worker.status)) {
    throw new Error(
      `Worker execution ${workflowExecutionId} never ran (status: ${worker.status}) — ` +
        `concurrency collision, not a model result.`
    );
  }

  // Every branch has settled once the worker is terminal; pick the review child
  // this run created (started at/after our run) — older reviews were cancelled above.
  const reviewChild = await assertSoleReviewChild({
    fetch,
    workflowExecutionId,
    workerStatus: worker.status,
    startedAt,
  });

  const review = await getExecution(fetch, reviewChild.id);

  // Reachability assert: a review that produced no diagnose proposal has nothing to
  // grade; `readProposalOrThrow` names which of the two causes the step list can tell
  // apart (agent step timeout vs. the seeded rule failing the diagnose gate).
  const proposal = readProposalOrThrow(review);

  return {
    ...proposal,
    executionId: review.id,
    executionStatus: review.status,
    // Trace-evaluator join keys, carried out of the harness so the evaluators
    // grade THIS run's trace rather than a stack-wide aggregate:
    //   stage 1 — the review execution's own trace id;
    //   stage 2 — the diagnose step's persisted conversation_id, read from the
    //             step executions (see extractConversationId).
    traceId: review.traceId,
    stepExecutions: review.stepExecutions,
  };
};

/** A review child parked on its `waitForApproval` gate, with the proposal it is showing. */
export interface RuleTuningApprovalRequest {
  /** The worker sweep that fanned this review out (kept for diagnostics). */
  workflowExecutionId: string;
  /** The review child execution currently parked on `review_tuning`. */
  reviewExecutionId: string;
  /** The diagnose proposal the gate is waiting on a decision for. */
  proposal: RuleTuningProposal;
}

/**
 * Drive the worker until its review child PARKS on the approval gate, and stop there.
 *
 * `runRuleTuningWorkflow` answers every gate with `approved: true`, so it can only ever
 * observe the apply arm. This harness deliberately leaves the gate unanswered so a spec can
 * take both arms and assert the observable difference between them — which is the only way
 * to show the gate is load-bearing rather than decorative.
 *
 * The same seeding/harvest contract as the auto-approve path applies: exactly one review
 * child must be opened, and it must carry a diagnose proposal (there is nothing to approve
 * or reject otherwise). Every failure path throws with the state that explains it — never
 * returns a "nothing to do" and never silently skips.
 */
export const runRuleTuningToApprovalGate = async ({
  fetch,
  log,
  maxWaitMs = 15 * 60_000,
  pollIntervalMs = 5_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  /**
   * A review has to run fetch_rule → diagnose (10m step timeout) → previews before it can
   * park, so this budget covers the whole child, not just the poll. It is not the gate's
   * own clock: the gate parks for up to 72h once reached.
   */
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<RuleTuningApprovalRequest> => {
  await cancelStaleExecutions({ fetch, log, pollIntervalMs });
  const { workflowExecutionId, startedAt } = await startWorkerSweep({ fetch, log });

  const deadline = Date.now() + maxWaitMs;
  let lastReviewStatus: ExecutionStatus | undefined;
  let lastWorkerStatus: ExecutionStatus | undefined;

  while (Date.now() < deadline) {
    const worker = await getExecution(fetch, workflowExecutionId);
    lastWorkerStatus = worker.status;

    if (neverRan(worker.status)) {
      throw new Error(
        `Worker execution ${workflowExecutionId} never ran (status: ${worker.status}) — ` +
          `concurrency collision, not a model result.`
      );
    }

    // A freshly scheduled sweep has to be picked up by the runtime (and then run its
    // harvest pass) before it can open its review child, so an empty child list here is
    // only meaningful once the worker has settled — `soleReviewChild` returns undefined
    // while it is still coming up and we poll again. More than one child means the cancel
    // pass missed something or the stack is shared; that fails immediately, naming the
    // fixture rather than a later ambiguous gate.
    const child = await soleReviewChild({
      fetch,
      workflowExecutionId,
      workerStatus: worker.status,
      startedAt,
    });

    if (!child) {
      // Sweep is still coming up: no child to inspect on this tick.
      await sleep(pollIntervalMs);
    } else {
      const review = await getExecution(fetch, child.id);
      lastReviewStatus = review.status;

      if (isAwaitingApproval(review.status)) {
        const proposal = readProposalOrThrow(review);
        log.info(
          `Review execution ${review.id} is parked on its approval gate ` +
            `(status: ${review.status}, change_type: ${proposal.change_type})`
        );
        return { workflowExecutionId, reviewExecutionId: review.id, proposal };
      }

      // The child finished without ever pausing: the gate is guarded on the diagnose step
      // producing a summary, so there is no pending decision to answer. Fail with the state
      // that distinguishes the two causes instead of polling a review that will never park.
      if (isTerminal(review.status)) {
        throw new Error(
          `Review execution ${review.id} reached ${review.status} without pausing at the ` +
            `approval gate (pendingApproval=false) — ${explainMissingProposal(
              review.stepExecutions ?? []
            )}`
        );
      }

      await sleep(pollIntervalMs);
    }
  }

  throw new Error(
    `Review execution never paused at the approval gate within ${maxWaitMs}ms ` +
      `(last review status: ${lastReviewStatus ?? 'no review child discovered'}, ` +
      `worker status: ${lastWorkerStatus ?? 'unknown'}) — the spec needs ` +
      `pendingApproval=true to take either arm.`
  );
};

/**
 * Answer a parked review's gate with `approved` and wait for the review to settle.
 *
 * Posts the same payload an analyst's inbox decision sends, on the workflow's own resume
 * route, and retries the 409 `waiting step not found` read-after-write race (see
 * `resumeApprovalGate`). Returns the terminal review execution so the caller can read the
 * apply steps' outcomes out of it.
 */
export const respondToReviewGate = async ({
  fetch,
  log,
  reviewExecutionId,
  approved,
  maxWaitMs = 5 * 60_000,
  pollIntervalMs = 3_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  reviewExecutionId: string;
  approved: boolean;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + maxWaitMs;

  let answered = false;
  while (!answered && Date.now() < deadline) {
    answered = await resumeApprovalGate(fetch, log, reviewExecutionId, pollIntervalMs, approved);
  }
  if (!answered) {
    throw new Error(
      `Could not answer the approval gate of review execution ${reviewExecutionId} within ` +
        `${maxWaitMs}ms — the waiting step never became resumable.`
    );
  }

  while (Date.now() < deadline) {
    const review = await getExecution(fetch, reviewExecutionId);
    if (isTerminal(review.status)) {
      return review;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Review execution ${reviewExecutionId} did not settle within ${maxWaitMs}ms after ` +
      `answering its gate (approved=${approved}).`
  );
};

/**
 * One line per step execution of a settled review, for failure messages: which steps ran,
 * and which of the apply/tag steps errored. A skipped step leaves no record, so an absent
 * `apply_query_tuning` here is itself the answer to "why was nothing applied?".
 */
export const describeStepExecutions = (execution: WorkflowExecutionDto): string =>
  (execution.stepExecutions ?? [])
    .map((step) => {
      const error = step.error ? ` error=${JSON.stringify(step.error).slice(0, 200)}` : '';
      return `${step.stepId}(${step.stepType})=${step.status}${error}`;
    })
    .join(', ');
