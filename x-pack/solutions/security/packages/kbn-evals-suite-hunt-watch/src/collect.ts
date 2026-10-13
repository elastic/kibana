/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  type ProposalWithMetadata,
} from '@kbn/proposals-common';
import type { HuntWatchRunResult } from './hunt_watch_client';
import {
  FIND_OR_CREATE_INVESTIGATION_STEP_ID,
  HUNT_STEP_ID,
  PACKAGE_REPORT_STEP_ID,
  PUBLIC_API_VERSION,
  RESOLVE_INDEX_SCOPE_GATE_STEP_ID,
  RESOLVE_RUN_OUTCOME_STEP_ID,
  SELECT_CANDIDATE_REPORTS_STEP_ID,
  THREAT_REPORTS_INDEX,
  WRITE_RUN_CONCLUSION_STEP_ID,
} from './constants';
import { buildHuntInvestigationConversationId } from './seed_hunt_data';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export interface SseData {
  severity?: string;
  hunt_result?: {
    has_confirmed_hit?: boolean;
    hit_sources?: string[];
    tier1?: { status?: string };
    tier2?: { status?: string; behaviors?: HuntBehaviorOutput[] };
  };
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
  durationMs?: number;
  indexScopeBlocked?: boolean;
  selectedIds: string[];
  skipped: unknown[];
  reports: Record<string, HuntReportArtifacts>;
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

const stepOutput = <T>(step?: WorkflowStepExecutionDto): T | undefined =>
  step?.output as T | undefined;

const findStepOutput = (
  steps: WorkflowStepExecutionDto[],
  stepId: string
): WorkflowStepExecutionDto | undefined => steps.find((s) => s.stepId === stepId);

const spacePrefix = (spaceId: string) => `/s/${encodeURIComponent(spaceId)}`;

const getConversation = async ({
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
      `${spacePrefix(spaceId)}/api/agent_builder/conversations/${encodeURIComponent(
        conversationId
      )}`,
      {
        method: 'GET',
        version: PUBLIC_API_VERSION,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      }
    );
  } catch (error) {
    if (/Status: 404|404 Not Found/.test(String(error))) return undefined;
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
      `${spacePrefix(spaceId)}${PROPOSALS_INTERNAL_URL}`,
      {
        method: 'GET',
        version: PROPOSALS_API_VERSION,
        headers: { 'elastic-api-version': PROPOSALS_API_VERSION },
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

  const reports: Record<string, HuntReportArtifacts> = {};
  for (const reportId of reportIds) {
    const branchIndex = selectedIds.indexOf(reportId);
    const branchSteps =
      branchIndex === -1 ? [] : steps.filter((step) => branchIndexOf(step) === branchIndex);
    const byId = (stepId: string) => branchSteps.find((s) => s.stepId === stepId);

    const huntStep = byId(HUNT_STEP_ID);
    const packageStep = byId(PACKAGE_REPORT_STEP_ID);
    const outcomeOut = stepOutput<{ outcome?: string; incomplete_stage?: string }>(
      byId(RESOLVE_RUN_OUTCOME_STEP_ID)
    );

    const conversationId = buildHuntInvestigationConversationId(reportId);
    const conversation = await getConversation({ fetch, spaceId, conversationId });
    const proposals = conversation
      ? await listProposalsWhenSettled({ fetch, spaceId, conversationId })
      : [];

    const reportDoc = await esClient
      .get<{ evidence?: unknown }>({ index: THREAT_REPORTS_INDEX, id: reportId })
      .then((r) => r._source)
      .catch((error) => {
        if ((error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) {
          return undefined;
        }
        throw error;
      });

    const sseEvents = (conversation?.attachments ?? [])
      .filter((a) => a.type === SSE_TYPE)
      .map((a) => asRecord(a.versions?.[a.versions.length - 1]?.data) as SseData)
      .filter(Boolean);

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
    durationMs: execution.duration ?? undefined,
    indexScopeBlocked: gate?.index_scope_blocked,
    selectedIds,
    skipped: selection?.skipped ?? [],
    reports,
  };
};
