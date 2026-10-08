/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import type {
  ChainHopRecord,
  ChainRunRecord,
  ChainWorkerKind,
  WorkerAutonomy,
} from '@kbn/security-evals-chain-safety';
import {
  ACTION_IDS,
  DEFAULT_POLL_INTERVAL_MS,
  HOP_TIMEOUTS_MS,
  PROPOSALS_API_VERSION,
  PROPOSALS_URL,
  PUBLIC_API_VERSION,
  WORKFLOW_IDS,
} from './constants';
import type { KbnRequestContext } from './worker_settings';

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ChainScenario {
  key: string;
  workerChain: ChainWorkerKind[];
  declaredAutonomy: Partial<Record<ChainWorkerKind, WorkerAutonomy>>;
  /** Seeded alerts: id + the host the alert fired on, for the D15 wrong-host check. */
  alerts: Array<{ id: string; hostId?: string }>;
  rule: { id: string; name: string };
  goldVerdict: 'true_positive' | 'false_positive' | 'inconclusive';
}

export interface RunChainParams {
  ctx: KbnRequestContext;
  log: ToolingLog;
  scenario: ChainScenario;
  /** kibana base commit the managed definitions shipped in; recorded on every run. */
  baseSha: string;
  /** Firing strategy for floor_alert_triage (design Rev 3 §3 / N3). */
  triageTrigger: 'manual-event' | 'alert-trigger';
  /** How the forensics sweep autonomy reaches the KI. */
  forensicsSweepMode: 'scheduled' | 'blocked';
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
}

interface InvestigationConversation {
  id: string;
  workflow_execution_ids?: string[];
  reopened?: boolean;
}

const readExecution = async (
  fetch: HttpHandler,
  workflowExecutionId: string
): Promise<WorkflowExecutionDto> =>
  (await fetch(`/api/workflows/executions/${encodeURIComponent(workflowExecutionId)}`, {
    method: 'GET',
    version: PUBLIC_API_VERSION,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    query: { includeOutput: true },
  })) as WorkflowExecutionDto;

const runWorkflow = async (
  fetch: HttpHandler,
  workflowId: string,
  inputs: Record<string, unknown>
): Promise<string> => {
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
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
  fetch: HttpHandler,
  log: ToolingLog,
  workflowExecutionId: string,
  hop: string,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<{ status: string; overrun: boolean }> => {
  const deadline = Date.now() + timeoutMs;
  let last: WorkflowExecutionDto | undefined;
  for (;;) {
    last = (await readExecution(fetch, workflowExecutionId).catch(() => last)) ?? last;
    if (last && isTerminal(last.status)) return { status: last.status, overrun: false };
    if (Date.now() >= deadline) {
      log.warning(`Hop "${hop}" (execution ${workflowExecutionId}) overran ${timeoutMs}ms`);
      return { status: last?.status ?? 'unreadable', overrun: true };
    }
    await sleep(pollIntervalMs);
  }
};

const listProposalsFor = async (
  ctx: KbnRequestContext,
  conversationId: string
): Promise<ProposalDto[]> => {
  const { proposals } = (await ctx.fetch(`${PROPOSALS_URL}?conversationId=${conversationId}`, {
    method: 'GET',
    version: PROPOSALS_API_VERSION,
    headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
  })) as { proposals: ProposalDto[] };
  return proposals ?? [];
};

const readInvestigation = async (
  ctx: KbnRequestContext,
  investigationId: string
): Promise<InvestigationConversation | undefined> =>
  (await ctx
    .fetch(`/api/agent_builder/conversations/${encodeURIComponent(investigationId)}`, {
      method: 'GET',
      version: PUBLIC_API_VERSION,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    })
    .catch(() => undefined)) as InvestigationConversation | undefined;

const waitForProposals = async (
  ctx: KbnRequestContext,
  conversationId: string,
  timeoutMs: number,
  pollIntervalMs: number
): Promise<ProposalDto[]> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const proposals = await listProposalsFor(ctx, conversationId).catch(() => []);
    if (proposals.length > 0) return proposals;
    if (Date.now() >= deadline) return [];
    await sleep(pollIntervalMs);
  }
};

const asAutonomy = (value: unknown): WorkerAutonomy | undefined =>
  value === 'manual' || value === 'assisted' || value === 'supervised' ? value : undefined;

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
export const runChain = async ({
  ctx,
  log,
  scenario,
  baseSha,
  triageTrigger,
  forensicsSweepMode,
  maxWaitMs = {},
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: RunChainParams): Promise<ChainRunRecord> => {
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
    hops.push({ hop, workflowId, workflowExecutionId, executionStatus: status, triggeredBy, autonomyRead });
  };

  let investigationId: string | undefined;
  const actions: ChainRunRecord['actions'] = [];
  let harnessInterference: string | undefined;

  const autonomyOf = (worker: ChainWorkerKind): WorkerAutonomy | undefined => {
    const declared = scenario.declaredAutonomy[worker];
    return declared;
  };

  if (scenario.workerChain.includes('alert-triage')) {
    const triageAutonomy = autonomyOf('alert-triage');
    const inputs =
      triageTrigger === 'manual-event'
        ? {
            // The manual trigger declares no inputs, but the engine accepts an
            // event payload shaped like the alert trigger's (verified in
            // workflows_management_api.test.ts:2330). N3 records which path ran.
            event: {
              triggerType: 'alert',
              rule: { id: scenario.rule.id, name: scenario.rule.name },
              alerts: scenario.alerts,
            },
          }
        : { alertIds: scenario.alerts.map((a) => a.id) };
    const executionId = await runWorkflow(ctx.fetch, WORKFLOW_IDS.alertTriage, inputs);
    const { status, overrun } = await waitForTerminal(
      ctx.fetch,
      log,
      executionId,
      'floor_alert_triage',
      timeouts.alertTriage,
      pollIntervalMs
    );
    record('floor_alert_triage', WORKFLOW_IDS.alertTriage, executionId, overrun ? 'timeout' : status, triageTrigger === 'manual-event' ? 'manual' : 'alert', triageAutonomy);
    if (overrun) harnessInterference = 'floor_alert_triage overran its per-hop timeout';

    // The triage run opened its Investigation; find it via the review workflow's
    // async execution, which carries the conversation on its context.
    const triageExecution = await readExecution(ctx.fetch, executionId).catch(() => undefined);
    investigationId =
      (triageExecution?.context?.output as { investigation_id?: string } | undefined)
        ?.investigation_id ?? investigationId;
  }

  if (scenario.workerChain.includes('attack-discovery')) {
    const adAutonomy = autonomyOf('attack-discovery');
    const executionId = await runWorkflow(ctx.fetch, WORKFLOW_IDS.attackDiscoveryRunner, {
      autonomy: adAutonomy,
      investigation_id: investigationId,
    });
    const { status, overrun } = await waitForTerminal(
      ctx.fetch,
      log,
      executionId,
      'attack_discovery_runner',
      timeouts.attackDiscoveryRunner,
      pollIntervalMs
    );
    record('attack_discovery_runner', WORKFLOW_IDS.attackDiscoveryRunner, executionId, overrun ? 'timeout' : status, 'manual', adAutonomy);
    if (overrun) harnessInterference = 'attack_discovery_runner overran its per-hop timeout';
  }

  const investigation = investigationId
    ? await readInvestigation(ctx, investigationId)
    : undefined;

  if (investigationId) {
    const proposals = await waitForProposals(
      ctx,
      investigationId,
      timeouts.perActionProposal,
      pollIntervalMs
    );
    for (const proposal of proposals) {
      actions.push({
        actionWorkflowId: proposal.actionWorkflowId,
        executionStatus: proposal.status === 'succeeded' ? 'completed' : proposal.status,
        proposalId: proposal.id,
        decidedBy: proposal.decidedBy,
        autonomyContext: {
          worker:
            proposal.actionWorkflowId === ACTION_IDS.closeAlertsFp
              ? 'alert-triage'
              : proposal.actionWorkflowId === ACTION_IDS.handoffToForensics
                ? 'attack-discovery'
                : 'endpoint-forensics',
          autonomy:
            (proposal.actionWorkflowId === ACTION_IDS.closeAlertsFp
              ? autonomyOf('alert-triage')
              : proposal.actionWorkflowId === ACTION_IDS.handoffToForensics
                ? autonomyOf('attack-discovery')
                : autonomyOf('endpoint-forensics')) ?? 'manual',
          verdictOrigin:
            scenario.goldVerdict === 'false_positive'
              ? 'false_positive'
              : scenario.goldVerdict,
          investigationReopened: investigation?.reopened,
          kiAutonomyFromScheduledSweep:
            forensicsSweepMode === 'scheduled' ? true : undefined,
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
    hops,
    actions,
    investigation: {
      id: investigationId,
      workflowExecutionIds: investigation?.workflow_execution_ids ?? [],
      reopened: investigation?.reopened ?? false,
    },
    harnessInterference,
  };
};
