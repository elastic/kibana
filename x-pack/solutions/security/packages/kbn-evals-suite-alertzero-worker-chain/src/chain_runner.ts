/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  type ChildWorkflowExecutionItem,
  ExecutionStatus,
  isExecuteAsyncStepType,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import type {
  ChainHopRecord,
  ChainRunRecord,
  ChainWorkerKind,
  VerdictOrigin,
  WorkerAutonomy,
} from '@kbn/security-evals-chain-safety';
import {
  ACTION_IDS,
  DEFAULT_POLL_INTERVAL_MS,
  HOP_TIMEOUTS_MS,
  PARKED_HOP_STATUS,
  PROPOSALS_API_VERSION,
  PROPOSALS_URL,
  PUBLIC_API_VERSION,
  WORKER_IDS,
  WORKFLOW_IDS,
} from './constants';
import {
  readWorkerAutonomy,
  resolveWorkerWorkflowId,
  spacePath,
  type KbnRequestContext,
} from './worker_settings';

/**
 * F1: minimal structural view of the ES client the spec passes in (Scout's
 * esClient). Only mget is needed: after seeding, the real alert docs are read
 * back from the seeded `.alerts-security.alerts-<space>` index so the triage
 * run receives the same full-document event the product's alert trigger emits.
 */
export interface AlertDocumentStore {
  mget(params: {
    index: string;
    docs: Array<{ _id: string }>;
  }): Promise<{ docs: Array<{ _id: string; found?: boolean; _source?: Record<string, unknown> }> }>;
}

/** The seeded alerts index (AD2_ALERTS_INDEX in the fp-tp seed, space "default"). */
export const SEEDED_ALERTS_INDEX = '.alerts-security.alerts-default';

const fetchSeededAlerts = async (
  ctx: KbnRequestContext,
  alertStore: AlertDocumentStore,
  alerts: ChainScenario['alerts']
): Promise<{
  index: string;
  fetched: Array<{ _id: string; _index: string; _source: Record<string, unknown> }>;
}> => {
  const index =
    ctx.spaceId && ctx.spaceId !== 'default'
      ? `.alerts-security.alerts-${ctx.spaceId}`
      : SEEDED_ALERTS_INDEX;
  const { docs } = await alertStore.mget({ index, docs: alerts.map(({ id }) => ({ _id: id })) });
  return {
    index,
    fetched: docs.flatMap((doc) =>
      doc.found && doc._source !== undefined
        ? [{ _id: doc._id, _index: index, _source: doc._source }]
        : []
    ),
  };
};

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * F2/N1: the concurrency manager takes an overlapping run out of the race in
 * three ways (concurrency_manager.ts): `cancel-in-progress` marks the displaced
 * run CANCELLED with `Cancelled due to concurrency limit (max: N)` (:199);
 * `drop` marks the NEW run SKIPPED with `Dropped due to concurrency limit
 * (max: N)` (:138); a full backlog marks it SKIPPED with `Queue full
 * (queue-size: N)` (:177). The public WorkflowExecutionDto does not declare
 * `cancellationReason`, so it is read defensively. Any of the three is harness
 * interference (INVALID, never scored), not a model failure —
 * attack_discovery_review is `drop`/max 1, so a re-dispatched review lands here.
 */
const concurrencyCancellation = (
  execution: WorkflowExecutionDto | undefined
): string | undefined => {
  const status = execution?.status;
  if (status !== ExecutionStatus.CANCELLED && status !== ExecutionStatus.SKIPPED) return undefined;
  const reason = (execution as { cancellationReason?: string }).cancellationReason;
  if (typeof reason !== 'string') return undefined;
  const byConcurrency =
    status === ExecutionStatus.CANCELLED
      ? reason.includes('concurrency limit')
      : reason.includes('Dropped due to concurrency limit') || reason.includes('Queue full');
  return byConcurrency ? reason : undefined;
};

/**
 * F2: floor_attack_discovery carries `settings.concurrency: {max: 1,
 * strategy: cancel-in-progress}` (floor_attack_discovery.yaml) — the product's
 * own limit, which the harness must not touch. When the eval runner executes
 * examples concurrently, overlapping AD hops cancel each other
 * (concurrency_manager.ts:199). The spec runs its experiment at concurrency 1
 * (WORKER_CHAIN_EXPERIMENT_CONCURRENCY), which also keeps seeding and cleanup
 * from overlapping another example's chain — the AD worker scans the whole
 * space, so a concurrently seeded example's alerts would leak into this one.
 * This in-process queue is only a guard for chain execution should a caller
 * raise that concurrency: it does NOT serialize seeding, so it is not a
 * substitute. Dropped rejections keep the queue alive across failures.
 */
let chainQueue: Promise<unknown> = Promise.resolve();

export interface ChainScenario {
  key: string;
  workerChain: ChainWorkerKind[];
  declaredAutonomy: Partial<Record<ChainWorkerKind, WorkerAutonomy>>;
  /** Seeded alerts: id + the host the alert fired on, for the D15 wrong-host check. */
  alerts: Array<{ id: string; hostId?: string }>;
  rule: { id: string; name: string };
  goldVerdict: 'true_positive' | 'false_positive' | 'inconclusive';
}

/** F4: one AD review Investigation's D55 array next to the array the product must have written. */
export interface ReviewInvestigationExecutionIds {
  investigationId: string;
  expectedExecutionIds: string[];
  workflowExecutionIds: string[];
}

/**
 * ChainRunRecord plus harness-only data this package grades. Defined here
 * (not in @kbn/security-evals-chain-safety) so the shared record shape stays
 * untouched.
 */
export type WorkerChainRunRecord = ChainRunRecord & {
  reviewInvestigations?: ReviewInvestigationExecutionIds[];
};

export interface RunChainParams {
  ctx: KbnRequestContext;
  log: ToolingLog;
  scenario: ChainScenario;
  /**
   * F1: ES access for reading the seeded alert documents back (mget). The
   * spec's Scout esClient satisfies this; kept structural so the package takes
   * no runtime dependency on @kbn/scout.
   */
  alertStore: AlertDocumentStore;
  /** kibana base commit the managed definitions shipped in; recorded on every run. */
  baseSha: string;
  /** Firing strategy for floor_alert_triage (design Rev 3 §3 / N3). */
  triageTrigger: 'manual-event' | 'alert-trigger';
  /** How the forensics sweep autonomy reaches the KI. */
  forensicsSweepMode: 'scheduled' | 'blocked';
  /**
   * B5/G20/R1: identities the chain's Workers run as — the per-worker
   * `settings.serviceAccountId` set, resolved by the caller before the run.
   * A `decidedBy` matching any of them is a worker auto-approval, not a human
   * decision. Never sourced from /internal/security/me (that is the eval
   * user, not the worker principal).
   */
  runAsIdentities?: { usernames?: Array<string | null | undefined> };
  maxWaitMs?: Partial<typeof HOP_TIMEOUTS_MS>;
  pollIntervalMs?: number;
}

export interface ChainProposal {
  id: string;
  actionWorkflowId?: string;
  status: string;
  decision?: string;
  decidedBy?: unknown;
  conversationId: string;
}

interface ProposalDto {
  id: string;
  actionWorkflowId?: string;
  status: string;
  decision?: string;
  decidedBy?: unknown;
  conversationId: string;
  /** Decision deadline the product parked the proposal under (R7). */
  expiresAt?: string;
  /** Gating execution to resume; absent when no workflow is waiting (R7). */
  workflowExecutionId?: string;
}

interface InvestigationConversation {
  id: string;
  /** D55 array, on the conversation's metadata — not top level (review B7). */
  metadata?: { workflow_execution_ids?: string[] };
  reopened?: boolean;
}

/**
 * `GET /api/workflows/executions/{id}/children` returns a BARE
 * `ChildWorkflowExecutionItem[]` (get_children_executions.ts) whose id field is
 * `executionId`. It lists only SYNC `workflow.execute` children one level down.
 */
const listChildExecutions = async (
  ctx: KbnRequestContext,
  workflowExecutionId: string
): Promise<ChildWorkflowExecutionItem[]> => {
  const body = (await ctx
    .fetch(
      spacePath(
        ctx.spaceId,
        `/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}/children`
      ),
      {
        method: 'GET',
        version: PUBLIC_API_VERSION,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      }
    )
    .catch(() => undefined)) as ChildWorkflowExecutionItem[] | undefined;
  return Array.isArray(body) ? body : [];
};

const readExecution = async (
  ctx: KbnRequestContext,
  workflowExecutionId: string
): Promise<WorkflowExecutionDto> =>
  (await ctx.fetch(
    spacePath(ctx.spaceId, `/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}`),
    {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      query: { includeOutput: true },
    }
  )) as WorkflowExecutionDto;

const runWorkflow = async (
  ctx: KbnRequestContext,
  workflowId: string,
  inputs: Record<string, unknown>
): Promise<string> => {
  const { workflowExecutionId } = (await ctx.fetch(
    spacePath(ctx.spaceId, `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`),
    {
      method: 'POST',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      body: JSON.stringify({ inputs }),
    }
  )) as { workflowExecutionId: string };
  return workflowExecutionId;
};

const waitForTerminal = async (
  ctx: KbnRequestContext,
  log: ToolingLog,
  workflowExecutionId: string,
  hop: string,
  timeoutMs: number,
  pollIntervalMs: number,
  /** Extra "done waiting" condition for a hop that legitimately parks (see isReviewSettled). */
  isSettled?: (execution: WorkflowExecutionDto) => boolean
): Promise<{ status: string; overrun: boolean; parked: boolean }> => {
  const deadline = Date.now() + timeoutMs;
  let last: WorkflowExecutionDto | undefined;
  for (;;) {
    last = (await readExecution(ctx, workflowExecutionId).catch(() => last)) ?? last;
    if (last && isTerminal(last.status)) {
      return { status: last.status, overrun: false, parked: false };
    }
    // B1: settled but not terminal = parked on its gate by design, reported
    // as `parked` so the hop is not mistaken for a stuck/failed one.
    if (last && isSettled?.(last)) {
      return { status: last.status, overrun: false, parked: true };
    }
    if (Date.now() >= deadline) {
      log.warning(`Hop "${hop}" (execution ${workflowExecutionId}) overran ${timeoutMs}ms`);
      return { status: last?.status ?? 'unreadable', overrun: true, parked: false };
    }
    await sleep(pollIntervalMs);
  }
};

const listProposalsFor = async (
  ctx: KbnRequestContext,
  conversationId: string
): Promise<ProposalDto[]> => {
  const { proposals } = (await ctx.fetch(
    spacePath(ctx.spaceId, `${PROPOSALS_URL}?conversationId=${conversationId}`),
    {
      method: 'GET',
      version: PROPOSALS_API_VERSION,
      headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
    }
  )) as { proposals: ProposalDto[] };
  return proposals ?? [];
};

const readInvestigation = async (
  ctx: KbnRequestContext,
  investigationId: string
): Promise<InvestigationConversation | undefined> =>
  (await ctx
    .fetch(
      spacePath(
        ctx.spaceId,
        `/api/agent_builder/conversations/${encodeURIComponent(investigationId)}`
      ),
      {
        method: 'GET',
        version: PUBLIC_API_VERSION,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      }
    )
    .catch(() => undefined)) as InvestigationConversation | undefined;

/**
 * R6: a proposal is settled once its lifecycle can no longer reach success —
 * pending/executing proposals are dropped by `isExecuted`, so reading one of
 * those and reporting `not_exercised` would silently mask an unsafe action.
 */
const SETTLED_PROPOSAL_STATUSES = new Set([
  'succeeded',
  'failed',
  'expired',
  'no_action',
  'superseded',
]);

/**
 * R7/R8: at Manual/Supervised autonomy the product parks an undecided proposal
 * at `pending` behind create_proposal.yaml's await_decision gate
 * (waitForApproval, 72h deadline). `workflowExecutionId` and `expiresAt` are
 * stamped on EVERY proposal at creation (create_proposal_step.ts), including the
 * auto path whose `pending` is a transient read before the worker auto-approves,
 * so neither field shows that a human is being waited on. The park is visible
 * only in the gate execution: `GET execution(workflowExecutionId)` is
 * `waiting_for_input` and unfinished (the check the product's resumeGate makes),
 * with an unexpired `expiresAt` (absent is NOT parked — the managed path always
 * sets it). Any other `pending` keeps polling: the auto path still deciding, or
 * a harness failure. A parked proposal is the correct outcome of a correct run
 * and never settles inside perActionProposal.
 */
const isParkedAwaitingDecision = async (
  ctx: KbnRequestContext,
  proposal: ProposalDto
): Promise<boolean> => {
  if (proposal.status !== 'pending') return false;
  if (proposal.workflowExecutionId === undefined || proposal.expiresAt === undefined) return false;
  const deadline = Date.parse(proposal.expiresAt);
  if (!Number.isFinite(deadline) || deadline <= Date.now()) return false;
  const gate = await readExecution(ctx, proposal.workflowExecutionId).catch(() => undefined);
  return gate?.status === ExecutionStatus.WAITING_FOR_INPUT && !gate.finishedAt;
};

const isProposalSettled = async (ctx: KbnRequestContext, proposal: ProposalDto): Promise<boolean> =>
  SETTLED_PROPOSAL_STATUSES.has(proposal.status) || (await isParkedAwaitingDecision(ctx, proposal));

const allSettled = async (ctx: KbnRequestContext, proposals: ProposalDto[]): Promise<boolean> => {
  for (const proposal of proposals) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await isProposalSettled(ctx, proposal))) return false;
  }
  return true;
};

const waitForProposals = async (
  ctx: KbnRequestContext,
  conversationId: string,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<{ proposals: ProposalDto[]; unsettledAtTimeout: boolean }> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const proposals = await listProposalsFor(ctx, conversationId).catch(() => []);
    if (proposals.length > 0 && (await allSettled(ctx, proposals))) {
      return { proposals, unsettledAtTimeout: false };
    }
    if (Date.now() >= deadline) {
      // R6: proposals exist but never settled inside perActionProposal. Return
      // them anyway (the record shows what was read) and let the caller flag
      // harness interference — never a silent `not_exercised`.
      return { proposals, unsettledAtTimeout: !(await allSettled(ctx, proposals)) };
    }
    await sleep(pollIntervalMs);
  }
};

/** The runner step that dispatches each attack's review (attack_discovery_runner.yaml). */
const REVIEW_DISPATCH_STEP_ID = 'run_review';

/**
 * The reviews are ASYNC grandchildren: floor → (sync, listed by /children) runner
 * → `workflow.executeAsync` review. /children never lists them, so walk floor →
 * runner and take each review's id from the runner's `run_review` step outputs
 * (`output.executionId`), which only the execution read carries.
 */
const collectReviewExecutionIds = async (
  ctx: KbnRequestContext,
  floorExecutionId: string
): Promise<Array<{ reviewId: string; runnerExecutionId: string }>> => {
  const children = await listChildExecutions(ctx, floorExecutionId);
  const reviews: Array<{ reviewId: string; runnerExecutionId: string }> = [];
  for (const runner of children.filter(
    (child) => child.workflowId === WORKFLOW_IDS.attackDiscoveryRunner
  )) {
    const runnerExecution = await readExecution(ctx, runner.executionId).catch(() => undefined);
    for (const step of runnerExecution?.stepExecutions ?? []) {
      const reviewId = (step.output as { executionId?: unknown } | undefined)?.executionId;
      const isDispatch =
        step.stepId === REVIEW_DISPATCH_STEP_ID || isExecuteAsyncStepType(step.stepType);
      if (isDispatch && typeof reviewId === 'string') {
        if (!reviews.some((r) => r.reviewId === reviewId)) {
          reviews.push({ reviewId, runnerExecutionId: runner.executionId });
        }
      }
    }
  }
  return reviews;
};

/**
 * A review is settled once it is terminal, or once it has raised its proposal
 * (`escalation_gate` ran) and is parked awaiting a human decision — at Manual /
 * Assisted autonomy that park lasts up to 176h, so terminal is not reachable
 * inside the hop timeout and must not be reported as an overrun.
 */
const isReviewSettled = (execution: WorkflowExecutionDto): boolean =>
  !isTerminal(execution.status) &&
  execution.stepExecutions?.some((s) => s.stepId === 'escalation_gate') === true;

interface ReviewResult {
  verdict?: VerdictOrigin;
  investigationId?: string;
}

const stepOutput = (execution: WorkflowExecutionDto | undefined, stepId: string): unknown =>
  execution?.stepExecutions?.find((s) => s.stepId === stepId)?.output;

/**
 * Verdict + Investigation id of one review. Read from the review's own step
 * outputs (`resolve_analysis`, `resolve_investigation_id`) so a review still
 * parked on its escalation gate is readable; `emit_result` / `context.output`
 * is the fallback once it has finished.
 */
const readReviewResult = (execution: WorkflowExecutionDto | undefined): ReviewResult => {
  const emitted = (execution?.context?.output ?? stepOutput(execution, 'emit_result')) as
    | { verdict?: unknown; investigation_id?: unknown }
    | undefined;
  const verdict =
    (stepOutput(execution, 'resolve_analysis') as { verdict?: unknown } | undefined)?.verdict ??
    emitted?.verdict;
  const investigationId =
    (
      stepOutput(execution, 'resolve_investigation_id') as
        | { investigation_id?: unknown }
        | undefined
    )?.investigation_id ?? emitted?.investigation_id;
  return {
    verdict:
      verdict === 'true_positive' || verdict === 'false_positive' || verdict === 'inconclusive'
        ? verdict
        : undefined,
    investigationId:
      typeof investigationId === 'string' && investigationId.length > 0
        ? investigationId
        : undefined,
  };
};

const asAutonomy = (value: unknown): WorkerAutonomy | undefined =>
  value === 'manual' || value === 'assisted' || value === 'supervised' ? value : undefined;

/** The execution's own `triggeredBy`, narrowed to what a hop record can carry. */
const asTriageTrigger = (value: unknown): ChainHopRecord['triggeredBy'] | undefined =>
  value === 'alert' || value === 'manual' || value === 'scheduled' ? value : undefined;

/**
 * Runs one repetition of a worker chain end to end and returns the
 * ChainRunRecord the safety gates judge:
 *
 *   seed (caller) → trigger floor_alert_triage (manual event or alert trigger,
 *   N3: the path used is recorded) or attack_discovery_runner (manual trigger;
 *   floor_attack_discovery is scheduled-only) → wait per-hop terminal (N5,
 *   per-hop timeouts name the hop that overran) → read Investigation
 *   (workflow_execution_ids, D55) + Proposals (decidedBy) → record.
 *
 * Autonomy is applied, not declared (N2): the caller has already written each
 * Worker's saved autonomy (worker_settings.ts); this reads back what each hop
 * actually consumed and stores that on the record.
 */
export const runChain = ({
  ctx,
  log,
  scenario,
  alertStore,
  baseSha,
  triageTrigger,
  forensicsSweepMode,
  runAsIdentities,
  maxWaitMs = {},
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunChainParams): Promise<WorkerChainRunRecord> => {
  // F2: whole chains run one at a time — floor_attack_discovery is max-1
  // cancel-in-progress, so overlapping AD hops cancel each other (18/21 in the
  // live smoke). The product's own limit stays untouched. The queue tail
  // swallows rejections (a failed chain must not poison the next example) but
  // the caller still sees the original rejection.
  const run = chainQueue.then(() =>
    runChainUnserialized({
      ctx,
      log,
      scenario,
      alertStore,
      baseSha,
      triageTrigger,
      forensicsSweepMode,
      runAsIdentities,
      maxWaitMs,
      pollIntervalMs,
    })
  );
  chainQueue = run.catch(() => undefined);
  return run;
};

const runChainUnserialized = async ({
  ctx,
  log,
  scenario,
  alertStore,
  baseSha,
  triageTrigger,
  forensicsSweepMode,
  runAsIdentities,
  maxWaitMs = {},
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunChainParams): Promise<WorkerChainRunRecord> => {
  const timeouts = { ...HOP_TIMEOUTS_MS, ...maxWaitMs };
  const hops: ChainHopRecord[] = [];

  const record = (
    hop: string,
    workflowId: string,
    workflowExecutionId: string,
    status: string,
    triggeredBy: ChainHopRecord['triggeredBy'],
    autonomyRead?: WorkerAutonomy
  ): void => {
    hops.push({
      hop,
      workflowId,
      workflowExecutionId,
      executionStatus: status,
      triggeredBy,
      autonomyRead,
    });
  };

  let investigationId: string | undefined;
  const actions: ChainRunRecord['actions'] = [];
  let harnessInterference: string | undefined;
  // N4: append, never overwrite — a second overrun must not hide the first.
  const markInterference = (note: string) => {
    harnessInterference =
      harnessInterference === undefined ? note : `${harnessInterference}; ${note}`;
  };

  // B6: autonomy read back from the product, not the scenario's declaration.
  // The caller writes the settings before runChain; this is the applied value.
  const appliedAutonomy: Partial<Record<ChainWorkerKind, WorkerAutonomy>> = {};
  const readBackAutonomy = async (worker: ChainWorkerKind, workerId: string) => {
    const applied = asAutonomy((await readWorkerAutonomy(ctx, workerId)).autonomy);
    if (applied !== undefined) appliedAutonomy[worker] = applied;
    return applied;
  };

  let appliedVerdictOrigin: VerdictOrigin | undefined;
  /** Investigations the AD reviews raised proposals on (handoff proposals live there). */
  const reviewInvestigations: Array<{
    id: string;
    verdict?: VerdictOrigin;
    /** The runner execution that dispatched this review (its `parent_run_id`). */
    runnerExecutionId: string;
  }> = [];
  /** F4: what each review's Investigation actually carries vs. what the product writes. */
  const reviewInvestigationIds: ReviewInvestigationExecutionIds[] = [];

  if (scenario.workerChain.includes('alert-triage')) {
    const triageAutonomy = await readBackAutonomy('alert-triage', WORKER_IDS.alertTriage);
    // The installed per-space workflow id (`<workerId>-<space>`), not the bare Worker id.
    const triageWorkflowId = await resolveWorkerWorkflowId(
      ctx,
      WORKER_IDS.alertTriage,
      WORKFLOW_IDS.alertTriage
    );
    // F1: mirror the production trigger path exactly. The alert trigger emits
    // full alert documents (`buildAlertEvent` over `preprocessAlertInputs`,
    // connectors/workflows/index.ts:269 — the alert-trigger emitter), and the
    // POST /run route (workflows_management_api.ts:753) applies the same
    // preprocessing when `event.triggerType === 'alert'` with `alertIds`
    // (preprocess_alert_inputs.ts:156). Passing expanded docs by hand (the old
    // shape) skipped `classify_alerts`' full-doc validation (`_id`, `_index`,
    // `@timestamp`, `kibana` — alert_trigger_schema.ts AlertSchema) and failed
    // 21/21. The caller must fetch the seeded docs' `_index` (the harness mgets
    // them from the seeded alerts index); any id that never indexed fails fast
    // here, before a workflow run is spent.
    const seededAlerts = await fetchSeededAlerts(ctx, alertStore, scenario.alerts);
    if (seededAlerts.fetched.length !== scenario.alerts.length) {
      const missing = scenario.alerts
        .filter(({ id }) => !seededAlerts.fetched.some((a) => a._id === id))
        .map(({ id }) => id);
      throw new Error(
        `Scenario "${scenario.key}": seeded alert(s) not found in ` +
          `"${seededAlerts.index}": ${missing.join(', ')}. ` +
          'The triage workflow requires full alert documents (F1); the seed must index them first.'
      );
    }
    const inputs =
      triageTrigger === 'manual-event'
        ? {
            // The manual trigger declares no inputs, but the engine accepts an
            // event payload shaped like the alert trigger's (verified in
            // workflows_management_api.test.ts:2330). N3 records which path ran.
            // F1: alertIds ({_id,_index}), not expanded docs — the run route's
            // preprocessing expands them the way the product's own trigger
            // would, through the rule type's formatAlert + expandFlattenedAlert.
            event: {
              triggerType: 'alert',
              rule: { id: scenario.rule.id, name: scenario.rule.name },
              alertIds: seededAlerts.fetched.map(({ _id, _index }) => ({ _id, _index })),
            },
          }
        : { alertIds: seededAlerts.fetched.map(({ _id }) => _id) };
    const executionId = await runWorkflow(ctx, triageWorkflowId, inputs);
    log.info(`floor_alert_triage started: execution ${executionId}`);
    const { status, overrun } = await waitForTerminal(
      ctx,
      log,
      executionId,
      'floor_alert_triage',
      timeouts.alertTriage,
      pollIntervalMs
    );
    // Nit: the execution records its own trigger; a harness constant would
    // only ever agree with itself. Fallback only when the field is unreadable.
    const triageExecution = await readExecution(ctx, executionId).catch(() => undefined);
    const concurrencyCancel = concurrencyCancellation(triageExecution);
    if (concurrencyCancel !== undefined) {
      markInterference(
        `floor_alert_triage cancelled by the product's concurrency limit: ${concurrencyCancel}`
      );
    }
    log.info(
      `floor_alert_triage finished: execution ${executionId} status ${overrun ? 'timeout' : status}`
    );
    const triggeredBy =
      asTriageTrigger(triageExecution?.triggeredBy) ??
      (triageTrigger === 'manual-event' ? 'manual' : 'alert');
    record(
      'floor_alert_triage',
      triageWorkflowId,
      executionId,
      overrun ? 'timeout' : status,
      triggeredBy,
      triageAutonomy
    );
    if (overrun) markInterference('floor_alert_triage overran its per-hop timeout');

    // B7/R3: the Investigation id is the create_investigation step's output —
    // the triage workflow declares no top-level outputs carrying it. The DTO
    // field is `stepExecutions` (WorkflowExecutionDto), not `steps`.
    const stepExecutions = triageExecution?.stepExecutions ?? [];
    const createdConversationId = (
      stepExecutions.find((s) => s.stepId === 'create_investigation')?.output as
        | { conversation_id?: unknown }
        | undefined
    )?.conversation_id;
    if (typeof createdConversationId === 'string') investigationId = createdConversationId;
  }

  if (scenario.workerChain.includes('attack-discovery')) {
    // R2: never POST /run on the bare system-security-attack-discovery-worker
    // runner — its run_generation step uses run-as-mode inherit, which fails
    // without a parent worker SA. Drive the installed per-space floor AD
    // workflow (scheduled-only in the product; POST /run on it is accepted —
    // the run route checks enabled + valid definition, not trigger types).
    const adAutonomy = await readBackAutonomy('attack-discovery', WORKER_IDS.attackDiscovery);
    const adWorkflowId = await resolveWorkerWorkflowId(
      ctx,
      WORKER_IDS.attackDiscovery,
      WORKFLOW_IDS.attackDiscovery
    );
    // N9: the floor AD workflow also carries a product schedule with
    // `cancel-in-progress` (floor_attack_discovery.yaml). A schedule tick landing
    // mid-run would cancel this manual run; the run then reads back as a
    // cancelled hop, not a model failure. Run the cell with the Worker's
    // schedule interval long (the default is 24h) or the schedule disabled.
    const executionId = await runWorkflow(ctx, adWorkflowId, {});
    log.info(`floor_attack_discovery started: execution ${executionId}`);
    const { status, overrun } = await waitForTerminal(
      ctx,
      log,
      executionId,
      'floor_attack_discovery',
      timeouts.attackDiscoveryRunner,
      pollIntervalMs
    );
    const adExecution = await readExecution(ctx, executionId).catch(() => undefined);
    const adConcurrencyCancel = concurrencyCancellation(adExecution);
    if (adConcurrencyCancel !== undefined) {
      markInterference(
        `floor_attack_discovery cancelled by the product's concurrency limit: ${adConcurrencyCancel}`
      );
    }
    log.info(
      `floor_attack_discovery finished: execution ${executionId} status ${
        overrun ? 'timeout' : status
      }`
    );
    const triggeredBy = asTriageTrigger(adExecution?.triggeredBy) ?? 'manual';
    record(
      'floor_attack_discovery',
      adWorkflowId,
      executionId,
      overrun ? 'timeout' : status,
      triggeredBy,
      adAutonomy
    );
    if (overrun) markInterference('floor_attack_discovery overran its per-hop timeout');

    // B6: verdict origin is each review's own verdict, read back from the
    // product — never scenario.goldVerdict. The reviews are async grandchildren
    // (floor → runner → executeAsync review): walk to them, wait each to
    // terminal, then read its verdict and the Investigation it raised proposals on.
    const dispatchedReviews = await collectReviewExecutionIds(ctx, executionId);
    log.info(
      `attack_discovery reviews: ${dispatchedReviews.map((r) => r.reviewId).join(', ') || 'none'}`
    );
    for (const { reviewId, runnerExecutionId } of dispatchedReviews) {
      log.info(`attack_discovery_review started: execution ${reviewId}`);
      const reviewWait = await waitForTerminal(
        ctx,
        log,
        reviewId,
        'attack_discovery_review',
        timeouts.attackDiscoveryReview,
        pollIntervalMs,
        isReviewSettled
      );
      const reviewExecution = await readExecution(ctx, reviewId).catch(() => undefined);
      const reviewConcurrencyCancel = concurrencyCancellation(reviewExecution);
      if (reviewConcurrencyCancel !== undefined) {
        markInterference(
          `attack_discovery_review ${reviewId} cancelled by the product's concurrency limit: ${reviewConcurrencyCancel}`
        );
      }
      // B1: a review parked on its escalation gate is the correct outcome at
      // Manual/Assisted autonomy; record it distinctly so ChainTerminal can
      // tell it from a failed/cancelled review (which stays a real 0).
      const reviewStatus = reviewWait.overrun
        ? 'timeout'
        : reviewWait.parked
        ? PARKED_HOP_STATUS
        : reviewWait.status;
      log.info(
        `attack_discovery_review finished: execution ${reviewId} status ${reviewStatus}${
          reviewWait.parked ? ` (engine status ${reviewWait.status})` : ''
        }`
      );
      record(
        'attack_discovery_review',
        WORKFLOW_IDS.attackDiscoveryReview,
        reviewId,
        reviewStatus,
        asTriageTrigger(reviewExecution?.triggeredBy) ?? 'unknown',
        adAutonomy
      );
      if (reviewWait.overrun) {
        markInterference(`attack_discovery_review ${reviewId} overran its per-hop timeout`);
      }
      const result = readReviewResult(reviewExecution);
      if (result.verdict !== undefined) appliedVerdictOrigin = result.verdict;
      if (result.investigationId !== undefined) {
        reviewInvestigations.push({
          id: result.investigationId,
          verdict: result.verdict,
          runnerExecutionId,
        });
      }
    }
  }

  const investigation = investigationId ? await readInvestigation(ctx, investigationId) : undefined;

  // Triage proposals sit on the triage Investigation; handoff proposals sit on each
  // review's own Investigation (a different conversation), so collect from both.
  const proposalSources: Array<{
    id: string;
    verdict?: VerdictOrigin;
    reopened?: boolean;
  }> = [];
  if (investigationId) {
    proposalSources.push({
      id: investigationId,
      verdict: appliedVerdictOrigin,
      reopened: investigation?.reopened,
    });
  }
  for (const review of reviewInvestigations) {
    if (!proposalSources.some((source) => source.id === review.id)) {
      const reviewInvestigation = await readInvestigation(ctx, review.id);
      reviewInvestigationIds.push({
        investigationId: review.id,
        // attack_discovery_review.yaml:263,278-285: the review seeds
        // `workflow_execution_ids` with its `parent_run_id` — the RUNNER's
        // execution id (attack_discovery_runner.yaml passes `{{ execution.id }}`),
        // not the floor's and not the review's own.
        expectedExecutionIds: [review.runnerExecutionId],
        workflowExecutionIds: reviewInvestigation?.metadata?.workflow_execution_ids ?? [],
      });
      proposalSources.push({
        id: review.id,
        verdict: review.verdict,
        reopened: reviewInvestigation?.reopened,
      });
    }
  }

  const seenProposalIds = new Set<string>();
  for (const source of proposalSources) {
    const { proposals, unsettledAtTimeout } = await waitForProposals(
      ctx,
      source.id,
      timeouts.perActionProposal,
      pollIntervalMs
    );
    if (unsettledAtTimeout) {
      // R6/R7: a proposal stuck in executing, or pending with no parked
      // decision gate, past perActionProposal would be dropped by the gate as
      // not executed — that is a harness timing failure, not a clean run;
      // never a silent `not_exercised`.
      markInterference(
        `proposals on ${source.id} did not reach a settled status within perActionProposal`
      );
    }
    for (const proposal of proposals.filter((p) => p.actionWorkflowId !== undefined)) {
      // eslint-disable-next-line no-continue
      if (seenProposalIds.has(proposal.id)) continue;
      seenProposalIds.add(proposal.id);
      // A proposal with no action workflow id cannot be attributed to a worker
      // or judged by the gate; it is filtered out rather than given a made-up id.
      const actionWorkflowId = proposal.actionWorkflowId as string;
      const worker: ChainWorkerKind =
        proposal.actionWorkflowId === ACTION_IDS.closeAlertsFp
          ? 'alert-triage'
          : proposal.actionWorkflowId === ACTION_IDS.handoffToForensics
          ? 'attack-discovery'
          : 'endpoint-forensics';
      actions.push({
        actionWorkflowId,
        executionStatus: proposal.status === 'succeeded' ? 'completed' : proposal.status,
        proposalId: proposal.id,
        // B5: an auto-approval writes decidedBy with the run-as identity —
        // "someone decided" — so presence alone cannot stand in for a human.
        // `gate_answered: false` on the auto path means decidedAt is the only
        // honest separator; the gate treats decidedBy === runAsIdentity as
        // worker-decided. The identity is parameterized (G20): the harness
        // records it, the gate compares it.
        decidedBy: proposal.decidedBy,
        autonomyContext: {
          worker,
          // B6: applied autonomy read back from the product above.
          autonomy: appliedAutonomy[worker] ?? 'manual',
          verdictOrigin: source.verdict,
          investigationReopened: source.reopened,
          kiAutonomyFromScheduledSweep: forensicsSweepMode === 'scheduled' ? true : undefined,
        },
      });
    }
  }

  return {
    runId: `${scenario.key}-${Date.now()}`,
    scenarioKey: scenario.key,
    workerChain: scenario.workerChain,
    baseSha,
    declaredAutonomy: scenario.declaredAutonomy,
    appliedAutonomy,
    runAsIdentities,
    hops,
    actions,
    investigation: {
      id: investigationId ?? reviewInvestigations[0]?.id,
      // B7: D55 array lives on the conversation's metadata, not top level.
      workflowExecutionIds: investigation?.metadata?.workflow_execution_ids ?? [],
      reopened: investigation?.reopened ?? false,
    },
    harnessInterference,
    reviewInvestigations: reviewInvestigationIds,
  };
};
