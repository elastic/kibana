/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  ChildWorkflowExecutionItem,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { huntResultSchema, type HuntResult } from '@kbn/alertzero-common';
import {
  MAX_PROPOSALS_PAGE_OFFSET,
  MAX_PROPOSALS_PAGE_SIZE,
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  type ProposalWithMetadata,
} from '@kbn/proposals-common';
import type { HuntWatchRunResult } from './hunt_watch_client';
import {
  FIND_OR_CREATE_INVESTIGATION_STEP_ID,
  HUNT_EXECUTE_WORKFLOW_ID,
  HUNT_STEP_ID,
  PACKAGE_REPORT_STEP_ID,
  PUBLIC_API_VERSION,
  RESOLVE_INDEX_SCOPE_GATE_STEP_ID,
  RESOLVE_RUN_OUTCOME_STEP_ID,
  READ_HUNT_RESULT_STEP_ID,
  SELECT_CANDIDATE_REPORTS_STEP_ID,
  THREAT_REPORTS_INDEX,
  WRITE_RUN_CONCLUSION_STEP_ID,
} from './constants';
import { buildHuntInvestigationConversationId } from './seed_hunt_data';
import { apiVersion, httpStatus, isEsNotFound, sleep, spacePath } from './kibana_api';

const REPORT_FAN_OUT_STEP_ID = 'report_fan_out';

export interface HuntBehaviorOutput {
  execution?: { hit?: boolean; executed?: boolean; row_count?: number };
  technique_name?: string;
  parent_technique_id?: string;
}

export interface HuntStepOutput {
  hit?: boolean;
  status?: string;
  headline?: string;
  reason?: string;
  sse_count?: number;
  behaviors?: HuntBehaviorOutput[];
}

export interface PackageStepOutput {
  status?: string;
  summary?: string;
  reason?: string;
}

/** Latest version of an SSE attachment, with `hunt_result` validated against `huntResultSchema`. */
export interface SseData {
  severity?: string;
  hunt_result?: HuntResult;
  /** Set when the attachment carried a `hunt_result` the schema rejected. */
  hunt_result_error?: string;
}

export interface ConversationAttachment {
  id: string;
  type: string;
  versions?: Array<{ data?: unknown }>;
}

export interface InvestigationConversation {
  id: string;
  metadata?: { status?: string; close_reason?: string };
  attachments?: ConversationAttachment[];
  events?: Array<{ type?: string; data?: { message?: string } }>;
}

export interface HuntReportArtifacts {
  reportId: string;
  /** Whether candidate selection picked this report for the run. */
  selected: boolean;
  /** Fan-out branch index (position in the selected ids), when selected. */
  branchIndex?: number;
  /** Per-stage status and start time for this branch, keyed by stepId (outputs are not kept). */
  stages: Record<string, { status: string; startedAt?: string }>;
  hunt?: HuntStepOutput;
  /**
   * The coordinator result the `hunt` child polled from `read_hunt_result`, minus Tier 1 sample
   * hits: the window, index patterns, resolved IOCs and Tier 2 targets the narrative reports.
   */
  coordinator?: Record<string, unknown>;
  packaging?: PackageStepOutput;
  /** `resolve_run_outcome` output for this branch. */
  outcome?: string;
  incompleteStage?: string;
  conversation?: InvestigationConversation;
  sseEvents: SseData[];
  proposals: ProposalWithMetadata[];
  /** `_source` of the report doc after the run, when it exists. */
  reportDoc?: { evidence?: unknown; [key: string]: unknown };
  /** Run narrative messages posted to the Investigation (hunt + conclusion), joined. */
  narrative: string;
}

export interface HuntArtifacts {
  spaceId: string;
  workflowExecutionId: string;
  executionStatus: string;
  /** When the Worker execution started; separates what this run created from earlier runs' leftovers. */
  runStartedAt: string;
  durationMs?: number;
  indexScopeBlocked?: boolean;
  selectedIds: string[];
  skipped: unknown[];
  reports: Record<string, HuntReportArtifacts>;
  /**
   * Every pending Proposal in the space after the run, across Investigations. The narrative's
   * convergence notes cite Proposals other Investigations raised, so the judge needs them too.
   */
  pendingProposalsInSpace: ProposalWithMetadata[];
  /** Judge analyses the task attaches after collection; read by the quantitative LLM evaluators. */
  correctnessAnalysis?: Record<string, unknown>;
  groundednessAnalysis?: Record<string, unknown>;
}

const SSE_TYPE = 'security.significant_security_event';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const branchIndexOf = (step: WorkflowStepExecutionDto): number | undefined => {
  const stack = (step.scopeStack ?? []) as Array<{
    stepId?: string;
    nestedScopes?: Array<{ scopeId?: string }>;
  }>;
  const frame = stack[stack.length - 1];
  if (frame?.stepId !== REPORT_FAN_OUT_STEP_ID) return undefined;
  const scopeId = frame.nestedScopes?.[0]?.scopeId;
  return scopeId === undefined ? undefined : Number(scopeId);
};

const toSseData = (data: Record<string, unknown>): SseData => {
  const severity = typeof data.severity === 'string' ? data.severity : undefined;
  if (data.hunt_result === undefined) return { severity };
  const parsed = huntResultSchema.safeParse(data.hunt_result);
  return parsed.success
    ? { severity, hunt_result: parsed.data }
    : { severity, hunt_result_error: parsed.error.message };
};

const stepOutput = <T>(step?: WorkflowStepExecutionDto): T | undefined =>
  step?.output as T | undefined;

const findStepOutput = (
  steps: WorkflowStepExecutionDto[],
  stepId: string
): WorkflowStepExecutionDto | undefined => steps.find((s) => s.stepId === stepId);

const executionPath = (spaceId: string, executionId: string, suffix = ''): string =>
  spacePath(spaceId, `/api/workflows/executions/${encodeURIComponent(executionId)}${suffix}`);

/** Child executions of the Worker run, keyed by the parent (branch) step execution id. */
const listChildExecutions = async ({
  fetch,
  spaceId,
  workflowExecutionId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  workflowExecutionId: string;
}): Promise<ChildWorkflowExecutionItem[]> =>
  fetch<ChildWorkflowExecutionItem[]>(executionPath(spaceId, workflowExecutionId, '/children'), {
    method: 'GET',
    headers: apiVersion(PUBLIC_API_VERSION),
  });

const withoutTier1Hits = (coordinator: Record<string, unknown>): Record<string, unknown> => {
  const tier1 = asRecord(coordinator.tier1);
  if (!tier1) return coordinator;
  const { hits, ...rest } = tier1;
  return { ...coordinator, tier1: rest };
};

const getCoordinatorOutput = async ({
  fetch,
  spaceId,
  children,
  huntStep,
}: {
  fetch: HttpHandler;
  spaceId: string;
  children: ChildWorkflowExecutionItem[];
  huntStep?: WorkflowStepExecutionDto;
}): Promise<Record<string, unknown> | undefined> => {
  // No hunt step on this branch means no child to read; without the guard a child item that
  // carries no parent step id would match `undefined === undefined`.
  if (!huntStep) return undefined;
  const child = children.find(
    (c) => c.parentStepExecutionId === huntStep.id && c.workflowId === HUNT_EXECUTE_WORKFLOW_ID
  );
  if (!child) return undefined;
  const execution = await fetch<WorkflowExecutionDto>(executionPath(spaceId, child.executionId), {
    method: 'GET',
    headers: apiVersion(PUBLIC_API_VERSION),
    query: { includeOutput: true },
  });
  return readCoordinatorResult(execution.stepExecutions);
};

/**
 * The coordinator result from the hunt child's poll loop. `read_hunt_result` runs once per
 * iteration and only the `completed` read carries `data.result`; a `failed` read carries
 * `data.error` instead and a run that never finished has no completed read at all, so both
 * yield `undefined` here, the same as a coordinator that was never started.
 */
export const readCoordinatorResult = (
  stepExecutions: Array<Pick<WorkflowStepExecutionDto, 'stepId' | 'output'>>
): Record<string, unknown> | undefined => {
  const result = stepExecutions
    .filter((s) => s.stepId === READ_HUNT_RESULT_STEP_ID)
    .map((s) => asRecord(asRecord(s.output)?.data))
    .filter((data): data is Record<string, unknown> => data?.state === 'completed')
    .map((data) => asRecord(data.result))
    .find((o) => o !== undefined);
  return result && withoutTier1Hits(result);
};

const listPendingProposalsInSpace = async ({
  fetch,
  spaceId,
}: {
  fetch: HttpHandler;
  spaceId: string;
}): Promise<ProposalWithMetadata[]> => {
  // Paged to exhaustion, the way the Worker's own open-Proposal gate reads this list
  // (`routes/hunt/candidates.ts`): on a long-lived stack a single capped page would hide a
  // duplicate actioned subject or the live Proposal a convergence note cites, and the
  // convergence scorer would pass or report MISSING for a reason that is not the Worker's.
  const proposals: ProposalWithMetadata[] = [];
  let from = 0;
  for (;;) {
    if (from > MAX_PROPOSALS_PAGE_OFFSET) {
      throw new Error(
        `Cannot enumerate pending Proposals in space "${spaceId}": more than ` +
          `${MAX_PROPOSALS_PAGE_OFFSET + MAX_PROPOSALS_PAGE_SIZE} exist and the list cannot page ` +
          `past Elasticsearch's result window.`
      );
    }
    const page = await fetch<{ proposals: ProposalWithMetadata[]; total: number }>(
      spacePath(spaceId, PROPOSALS_INTERNAL_URL),
      {
        method: 'GET',
        headers: apiVersion(PROPOSALS_API_VERSION),
        query: { status: 'pending', excludeSuperseded: true, size: MAX_PROPOSALS_PAGE_SIZE, from },
      }
    );
    proposals.push(...page.proposals);
    from += page.proposals.length;
    if (page.proposals.length === 0 || from >= page.total) return proposals;
  }
};

/** Reads an Investigation conversation in a space, or `undefined` when it does not exist there. */
export const getConversation = async ({
  fetch,
  spaceId,
  conversationId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
}): Promise<InvestigationConversation | undefined> => {
  try {
    return await fetch<InvestigationConversation>(
      spacePath(spaceId, `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`),
      { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
    );
  } catch (error) {
    if (httpStatus(error) === 404) return undefined;
    throw error;
  }
};

/**
 * Proposals are created asynchronously by approval gates that packaging launches, so the count
 * is read until it holds steady rather than once.
 */
const listProposalsWhenSettled = async ({
  fetch,
  spaceId,
  conversationId,
  settleMs = 9_000,
  maxWaitMs = 60_000,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
  settleMs?: number;
  maxWaitMs?: number;
}): Promise<ProposalWithMetadata[]> => {
  const deadline = Date.now() + maxWaitMs;
  let lastCount = -1;
  let stableSince = Date.now();
  let latest: ProposalWithMetadata[] = [];

  while (Date.now() < deadline) {
    const response = await fetch<{ proposals: ProposalWithMetadata[] }>(
      spacePath(spaceId, PROPOSALS_INTERNAL_URL),
      {
        method: 'GET',
        headers: apiVersion(PROPOSALS_API_VERSION),
        query: { conversationId, size: 100 },
      }
    );
    latest = response.proposals;
    if (latest.length !== lastCount) {
      lastCount = latest.length;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= settleMs) {
      break;
    }
    await sleep(3_000);
  }
  return latest;
};

/**
 * Reads everything the evaluators score, per requested report: the Worker's step tree for that
 * fan-out branch, the Investigation conversation, its Proposals, and the report doc.
 */
export const collectHuntArtifacts = async ({
  run,
  reportIds,
  fetch,
  esClient,
  log,
}: {
  run: HuntWatchRunResult;
  reportIds: string[];
  fetch: HttpHandler;
  esClient: Client;
  log: ToolingLog;
}): Promise<HuntArtifacts> => {
  const { spaceId, stepExecutions: steps, execution } = run;

  const gate = stepOutput<{ index_scope_blocked?: boolean }>(
    findStepOutput(steps, RESOLVE_INDEX_SCOPE_GATE_STEP_ID)
  );
  const selection = stepOutput<{ ids?: string[]; skipped?: unknown[] }>(
    findStepOutput(steps, SELECT_CANDIDATE_REPORTS_STEP_ID)
  );
  const selectedIds = selection?.ids ?? [];
  const children =
    selectedIds.length > 0
      ? await listChildExecutions({ fetch, spaceId, workflowExecutionId: run.workflowExecutionId })
      : [];

  const reports: Record<string, HuntReportArtifacts> = {};
  for (const reportId of reportIds) {
    const branchIndex = selectedIds.indexOf(reportId);
    const branchSteps =
      branchIndex === -1 ? [] : steps.filter((step) => branchIndexOf(step) === branchIndex);
    const byId = (stepId: string) => branchSteps.find((s) => s.stepId === stepId);

    const huntStep = byId(HUNT_STEP_ID);
    const coordinator = await getCoordinatorOutput({ fetch, spaceId, children, huntStep });
    const packageStep = byId(PACKAGE_REPORT_STEP_ID);
    const outcomeOut = stepOutput<{ outcome?: string; incomplete_stage?: string }>(
      byId(RESOLVE_RUN_OUTCOME_STEP_ID)
    );

    const conversationId = buildHuntInvestigationConversationId({ spaceId, reportId });
    const conversation = await getConversation({ fetch, spaceId, conversationId });
    const proposals = conversation
      ? await listProposalsWhenSettled({ fetch, spaceId, conversationId })
      : [];

    const reportDoc = await esClient
      .get<{ evidence?: unknown }>({ index: THREAT_REPORTS_INDEX, id: reportId })
      .then((r) => r._source)
      .catch((error) => {
        if (isEsNotFound(error)) return undefined;
        throw error;
      });

    const sseEvents = (conversation?.attachments ?? [])
      .filter((a) => a.type === SSE_TYPE)
      .map((a) => asRecord(a.versions?.[a.versions.length - 1]?.data))
      .filter((data): data is Record<string, unknown> => data !== undefined)
      .map(toSseData);

    const narrative = (conversation?.events ?? [])
      .filter((e) => e.type === 'user_message' && e.data?.message)
      .map((e) => e.data?.message as string)
      .join('\n\n');

    reports[reportId] = {
      reportId,
      selected: branchIndex !== -1,
      ...(branchIndex === -1 ? {} : { branchIndex }),
      stages: Object.fromEntries(
        [
          FIND_OR_CREATE_INVESTIGATION_STEP_ID,
          HUNT_STEP_ID,
          PACKAGE_REPORT_STEP_ID,
          WRITE_RUN_CONCLUSION_STEP_ID,
        ].flatMap((stepId) => {
          const step = byId(stepId);
          return step ? [[stepId, { status: step.status, startedAt: step.startedAt }]] : [];
        })
      ),
      hunt: stepOutput<HuntStepOutput>(huntStep),
      coordinator,
      packaging: stepOutput<PackageStepOutput>(packageStep),
      outcome: outcomeOut?.outcome,
      incompleteStage: outcomeOut?.incomplete_stage || undefined,
      conversation,
      sseEvents,
      proposals,
      reportDoc: reportDoc as HuntReportArtifacts['reportDoc'],
      narrative,
    };
    log.debug(
      `Collected ${reportId}: outcome=${outcomeOut?.outcome} proposals=${proposals.length} sse=${sseEvents.length}`
    );
  }

  return {
    spaceId,
    workflowExecutionId: run.workflowExecutionId,
    executionStatus: execution.status,
    runStartedAt: execution.startedAt,
    durationMs: execution.duration ?? undefined,
    indexScopeBlocked: gate?.index_scope_blocked,
    selectedIds,
    skipped: selection?.skipped ?? [],
    reports,
    pendingProposalsInSpace: await listPendingProposalsInSpace({ fetch, spaceId }),
  };
};
