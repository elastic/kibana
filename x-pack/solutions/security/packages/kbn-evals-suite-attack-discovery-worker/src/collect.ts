/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  MATCH_FINGERPRINTS_STEP_ID,
  PUBLIC_API_VERSION,
  RESOLVE_FANOUT_STEP_ID,
  REPORT_RUN_COMPLETED_STEP_ID,
  REPORT_WORKER_RUN_COMPLETED_STEP_ID,
  REVIEW_DISPATCH_STEP_IDS,
  REVIEW_SETTLE_TIMEOUT_MS,
  RUN_GENERATION_STEP_ID,
} from './constants';
import { apiVersion, httpStatus, spacePath } from './kibana_api';
import type { SeededScenario } from './seed';
import { isTerminal, stepsOf, type AttackDiscoveryWorkerClient } from './worker_client';
import type {
  ReviewArtifact,
  StepSnapshot,
  Verdict,
  WorkerArtifacts,
  WorkerOutcomeEvent,
} from './worker_types';

const VERDICT_ATTACHMENT_TYPE = 'security.attack_discovery.verdict';

/** Review steps worth keeping as snapshots: the verdict path and the analyst gate. */
const REVIEW_SNAPSHOT_STEP_IDS: readonly string[] = [
  'open_investigation',
  'verify_investigation',
  'resolve_analysis',
  'resolve_escalation',
  'escalation_gate',
  'record_gate_failed',
  'record_decision',
  'emit_result',
];

const VERDICTS: readonly Verdict[] = ['false_positive', 'true_positive', 'inconclusive', 'failed'];

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const asVerdict = (value: unknown): Verdict | undefined =>
  VERDICTS.find((verdict) => verdict === value);

const outputOf = (
  step: WorkflowStepExecutionDto | undefined
): Record<string, unknown> | undefined => asRecord(step?.output);

const firstStep = (execution: WorkflowExecutionDto, stepId: string) =>
  stepsOf(execution, stepId)[0];

/** Reads a dotted field from a document that stores it flat or nested. */
export const readField = (doc: Record<string, unknown>, path: string): unknown => {
  if (path in doc) return doc[path];
  let current: unknown = doc;
  for (const key of path.split('.')) {
    current = asRecord(current)?.[key];
    if (current === undefined) return undefined;
  }
  return current;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/**
 * Maps persisted discovery documents to the shape the audit evaluators read, with the seeded
 * alert ids translated back to the scenario's own ids.
 */
export const toInsights = (
  docs: readonly Record<string, unknown>[],
  goldIdBySeededId: ReadonlyMap<string, string>
): { insights: AttackDiscovery[]; ids: string[] } => {
  const insights: AttackDiscovery[] = [];
  const ids: string[] = [];
  for (const doc of docs) {
    const id = asString(readField(doc, 'kibana.alert.uuid'));
    if (id) ids.push(id);
    const tactics = strings(readField(doc, 'kibana.alert.attack_discovery.mitre_attack_tactics'));
    insights.push({
      ...(id ? { id } : {}),
      alertIds: strings(readField(doc, 'kibana.alert.attack_discovery.alert_ids')).map(
        (alertId) => goldIdBySeededId.get(alertId) ?? alertId
      ),
      title: asString(readField(doc, 'kibana.alert.attack_discovery.title')) ?? '',
      summaryMarkdown:
        asString(readField(doc, 'kibana.alert.attack_discovery.summary_markdown')) ?? '',
      detailsMarkdown:
        asString(readField(doc, 'kibana.alert.attack_discovery.details_markdown')) ?? '',
      entitySummaryMarkdown: asString(
        readField(doc, 'kibana.alert.attack_discovery.entity_summary_markdown')
      ),
      ...(tactics.length > 0 ? { mitreAttackTactics: tactics } : {}),
    });
  }
  return { insights, ids };
};

const snapshot = (step: WorkflowStepExecutionDto): StepSnapshot => ({
  stepId: step.stepId,
  status: step.status,
  input: step.input,
  output: step.output,
});

/**
 * The Investigation id the review derives from the attack id:
 * `<a[0:8]>-<a[8:12]>-8<a[12:15]>-8<a[15:18]>-<a[18:30]>`.
 */
export const investigationIdFor = (attackDiscoveryId: string): string | undefined => {
  const hex = attackDiscoveryId.replace(/-/g, '');
  if (hex.length < 30) return undefined;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(12, 15)}-8${hex.slice(
    15,
    18
  )}-${hex.slice(18, 30)}`;
};

interface ConversationDto {
  id: string;
  metadata?: { status?: string; close_reason?: string };
  attachments?: Array<{ id: string; type: string; versions?: Array<{ data?: unknown }> }>;
}

export const getConversation = async ({
  fetch,
  spaceId,
  conversationId,
}: {
  fetch: HttpHandler;
  spaceId: string;
  conversationId: string;
}): Promise<ConversationDto | undefined> => {
  try {
    return await fetch<ConversationDto>(
      spacePath(spaceId, `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`),
      { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
    );
  } catch (error) {
    if (httpStatus(error) === 404) return undefined;
    throw error;
  }
};

const attackIdOf = (
  dispatch: WorkflowStepExecutionDto | undefined,
  review: WorkflowExecutionDto
): string | undefined => {
  const fromContext = asString(asRecord(asRecord(review.context)?.inputs)?.attack_discovery_id);
  if (fromContext) return fromContext;
  const input = asRecord(dispatch?.input);
  return (
    asString(input?.attack_discovery_id) ??
    asString(asRecord(input?.inputs)?.attack_discovery_id) ??
    asString(outputOf(firstStep(review, 'emit_result'))?.attack_discovery_id)
  );
};

const isTruthy = (value: unknown): boolean => value === true || value === 'true';

/**
 * A review is parked at the analyst gate only when all of these hold:
 * - the analysis chose to escalate (`resolve_escalation.output.escalate`);
 * - the `escalation_gate` step exists and has not ended, so something is still waiting on it;
 * - the gate did not error (`record_gate_failed` is the step that records a gate error);
 * - the review itself is waiting rather than ended.
 * A review that is merely waiting for any other reason is not parked.
 */
export const isParkedAtGate = (review: WorkflowExecutionDto): boolean => {
  if (isTerminal(review.status) || !review.status.startsWith('waiting')) return false;
  if (!isTruthy(outputOf(firstStep(review, 'resolve_escalation'))?.escalate)) return false;
  const gate = firstStep(review, 'escalation_gate');
  if (!gate || isTerminal(gate.status)) return false;
  return stepsOf(review, 'record_gate_failed').length === 0;
};

/** A review is settled once it ends or parks at the analyst gate (see `isParkedAtGate`). */
export const isReviewSettled = (review: WorkflowExecutionDto): boolean =>
  isTerminal(review.status) || isParkedAtGate(review);

const buildReviewArtifact = async ({
  review,
  timedOutAfterMs,
  dispatch,
  fetch,
  spaceId,
}: {
  review: WorkflowExecutionDto;
  timedOutAfterMs?: number;
  dispatch: WorkflowStepExecutionDto | undefined;
  fetch: HttpHandler;
  spaceId: string;
}): Promise<ReviewArtifact> => {
  const emit = outputOf(firstStep(review, 'emit_result'));
  const analysis = outputOf(firstStep(review, 'resolve_analysis'));
  const attackDiscoveryId = attackIdOf(dispatch, review);
  const investigationId =
    asString(emit?.investigation_id) ??
    (attackDiscoveryId ? investigationIdFor(attackDiscoveryId) : undefined);
  const conversation = investigationId
    ? await getConversation({ fetch, spaceId, conversationId: investigationId })
    : undefined;
  const verdictAttachment = conversation?.attachments?.find(
    ({ type }) => type === VERDICT_ATTACHMENT_TYPE
  );
  const attachmentData = asRecord(verdictAttachment?.versions?.slice(-1)[0]?.data);
  const opened = emit?.investigation_opened;

  return {
    executionId: review.id,
    attackDiscoveryId,
    status: review.status,
    parked: isParkedAtGate(review),
    ...(timedOutAfterMs !== undefined ? { timedOutAfterMs } : {}),
    verdict:
      asVerdict(analysis?.verdict) ??
      asVerdict(emit?.verdict) ??
      asVerdict(attachmentData?.verdict),
    investigationId,
    investigationOpened: conversation !== undefined || opened === true || opened === 'true',
    proposalStatus: asString(emit?.proposal_status),
    proposalDecision: asString(emit?.proposal_decision),
    verdictSummary: asString(attachmentData?.summary_markdown),
    verdictRationale: asString(attachmentData?.rationale_markdown),
    steps: review.stepExecutions
      .filter(({ stepId }) => REVIEW_SNAPSHOT_STEP_IDS.includes(stepId))
      .map(snapshot),
  };
};

const outcomeEvents = (run: WorkflowExecutionDto): WorkerOutcomeEvent[] =>
  [REPORT_RUN_COMPLETED_STEP_ID, REPORT_WORKER_RUN_COMPLETED_STEP_ID].flatMap((stepId) =>
    stepsOf(run, stepId).map((step) => {
      const input = asRecord(step.input);
      return {
        stepId,
        status: step.status,
        runOutcome: asString(input?.run_outcome),
        ...(input ? { input } : {}),
      };
    })
  );

/**
 * Collects what one runner execution produced: the persisted discoveries, the fingerprint
 * match result, every review it dispatched (polled until it ends or parks at the analyst gate)
 * and the outcome events it reported.
 */
export const collectWorkerArtifacts = async ({
  client,
  run,
  runTimedOutAfterMs,
  spaceId,
  seeded,
  fetch,
  log,
}: {
  client: AttackDiscoveryWorkerClient;
  run: WorkflowExecutionDto;
  runTimedOutAfterMs?: number;
  spaceId: string;
  seeded: SeededScenario;
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<WorkerArtifacts> => {
  const generation = outputOf(firstStep(run, RUN_GENERATION_STEP_ID));
  const fanout = outputOf(firstStep(run, RESOLVE_FANOUT_STEP_ID));
  const emit = outputOf(firstStep(run, 'emit_result'));
  const docs = (Array.isArray(generation?.attack_discoveries) ? generation.attack_discoveries : [])
    .map(asRecord)
    .filter((doc): doc is Record<string, unknown> => doc !== undefined);
  const { insights, ids } = toInsights(docs, seeded.goldIdBySeededId);

  const match = firstStep(run, MATCH_FINGERPRINTS_STEP_ID);
  const matchOutput = outputOf(match);
  const matchFailed = match !== undefined && (match.status === 'failed' || match.error != null);

  const dispatches = REVIEW_DISPATCH_STEP_IDS.flatMap((stepId) => stepsOf(run, stepId)).flatMap(
    (step) => {
      const executionId = asString(outputOf(step)?.executionId);
      return executionId ? [{ step, executionId }] : [];
    }
  );
  dispatches.forEach(({ executionId }) => client.track(spaceId, executionId));

  const reviews = await Promise.all(
    dispatches.map(async ({ step, executionId }) => {
      const { execution: review, timedOutAfterMs } = await client.poll({
        spaceId,
        executionId,
        maxWaitMs: REVIEW_SETTLE_TIMEOUT_MS,
        isDone: isReviewSettled,
      });
      return buildReviewArtifact({ review, timedOutAfterMs, dispatch: step, fetch, spaceId });
    })
  );
  log.info(
    `[ad-worker] run ${run.id}: ${insights.length} discoveries, ${reviews.length} reviews dispatched`
  );

  return {
    runnerExecutionId: run.id,
    runnerStatus: run.status,
    runnerError: run.error?.message,
    runnerStepCount: run.stepExecutions.length,
    ...(runTimedOutAfterMs !== undefined ? { runnerTimedOutAfterMs: runTimedOutAfterMs } : {}),
    seededAlertCount: seeded.alertCount,
    alertsAnalyzed: asNumber(generation?.alerts_analyzed) ?? asNumber(emit?.alerts_analyzed),
    attacksGenerated:
      asNumber(generation?.discoveries_generated) ?? asNumber(emit?.attacks_generated),
    reviewsRequested: asNumber(fanout?.attack_count) ?? asNumber(emit?.reviews_requested),
    insights,
    persistedAttackIds: ids,
    fingerprintReviewCount: Array.isArray(matchOutput?.reviews)
      ? matchOutput.reviews.length
      : undefined,
    fingerprintAttachCount: Array.isArray(matchOutput?.attachments)
      ? matchOutput.attachments.length
      : undefined,
    fingerprintMatchFailed: matchFailed,
    dispatchedReviewExecutionIds: dispatches.map(({ executionId }) => executionId),
    reviews,
    outcomes: outcomeEvents(run),
  };
};
