/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscovery,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  BATCHED_GENERATION_WORKFLOW_ID,
  FP_TP_ANALYSIS_STEP_ID,
  FP_TP_ANALYZE_STEP_ID,
  MATCH_FINGERPRINTS_STEP_ID,
  PUBLIC_API_VERSION,
  RESOLVE_FANOUT_STEP_ID,
  REPORT_RUN_COMPLETED_STEP_ID,
  REPORT_WORKER_RUN_COMPLETED_STEP_ID,
  REVIEW_DISPATCH_STEP_IDS,
  REVIEW_SETTLE_TIMEOUT_MS,
  RUN_GENERATION_STEP_ID,
  attackDiscoveryIndexForSpace,
} from './constants';
import { apiVersion, errorMessage, httpStatus, spacePath } from './kibana_api';
import type { SeededScenario } from './seed';
import { isTerminal, stepsOf, type AttackDiscoveryWorkerClient } from './worker_client';
import type {
  GenerationFault,
  GenerationUsage,
  ReviewAnalysisUsage,
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

/**
 * Reads a dotted field from a document that stores it flat, nested, or a mix: at each level
 * the longest flat key that prefixes the remaining path wins.
 */
export const readField = (doc: Record<string, unknown>, path: string): unknown => {
  if (path in doc) return doc[path];
  const parts = path.split('.');
  for (let length = parts.length - 1; length >= 1; length--) {
    const head = parts.slice(0, length).join('.');
    const child = asRecord(doc[head]);
    if (child) {
      const found = readField(child, parts.slice(length).join('.'));
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const DISCOVERY_PREFIX = 'kibana.alert.attack_discovery';

/** `{ token: original }` from the stored `replacements` list of `{ uuid, value }` pairs. */
const replacementsOf = (doc: Record<string, unknown>): Replacements => {
  const stored = readField(doc, `${DISCOVERY_PREFIX}.replacements`);
  const pairs = Array.isArray(stored) ? stored : stored === undefined ? [] : [stored];
  return Object.fromEntries(
    pairs.flatMap((pair) => {
      const uuid = asString(asRecord(pair)?.uuid);
      const value = asString(asRecord(pair)?.value);
      return uuid && value ? [[uuid, value]] : [];
    })
  );
};

/**
 * A narrative field as the analyst reads it: the stored `<field>_with_replacements` value when
 * present, otherwise the anonymized `<field>` with the document's own replacements applied.
 * Generation sees anonymized tokens, so scanning the raw field would miss the real entity names.
 */
const readNarrative = (
  doc: Record<string, unknown>,
  field: string,
  replacements: Replacements
): string | undefined => {
  const restored = asString(readField(doc, `${DISCOVERY_PREFIX}.${field}_with_replacements`));
  if (restored !== undefined) return restored;
  const raw = asString(readField(doc, `${DISCOVERY_PREFIX}.${field}`));
  return raw !== undefined && Object.keys(replacements).length > 0
    ? replaceAnonymizedValuesWithOriginalValues({ messageContent: raw, replacements })
    : raw;
};

/**
 * Maps persisted discovery documents to the shape the audit evaluators read, with the seeded
 * alert ids translated back to the scenario's own ids and the narrative de-anonymized.
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
    const tactics = strings(readField(doc, `${DISCOVERY_PREFIX}.mitre_attack_tactics`));
    const replacements = replacementsOf(doc);
    insights.push({
      ...(id ? { id } : {}),
      alertIds: strings(readField(doc, `${DISCOVERY_PREFIX}.alert_ids`)).map(
        (alertId) => goldIdBySeededId.get(alertId) ?? alertId
      ),
      title: readNarrative(doc, 'title', replacements) ?? '',
      summaryMarkdown: readNarrative(doc, 'summary_markdown', replacements) ?? '',
      detailsMarkdown: readNarrative(doc, 'details_markdown', replacements) ?? '',
      entitySummaryMarkdown: readNarrative(doc, 'entity_summary_markdown', replacements),
      ...(tactics.length > 0 ? { mitreAttackTactics: tactics } : {}),
    });
  }
  return { insights, ids };
};

const distinct = (values: readonly (string | undefined)[]): string[] => [
  ...new Set(values.filter((value): value is string => value !== undefined)),
];

/**
 * What generation ran on, from the `api_config` each persisted discovery carries (the runner
 * stores the connector the generation call resolved to). The runner reports no generation
 * token usage, so none is read.
 */
export const generationUsageOf = (docs: readonly Record<string, unknown>[]): GenerationUsage => {
  const connectors = docs.map((doc) =>
    asString(readField(doc, 'kibana.alert.attack_discovery.api_config.connector_id'))
  );
  return {
    discoveryCount: docs.length,
    connectorIds: distinct(connectors),
    models: distinct(
      docs.map((doc) => asString(readField(doc, 'kibana.alert.attack_discovery.api_config.model')))
    ),
    discoveriesWithoutConnector: connectors.filter((id) => id === undefined).length,
  };
};

/** The id the engine reports for a step that did not resolve a connector. */
const UNKNOWN_CONNECTOR = 'unknown';

/**
 * What a review's FP/TP analysis ran on: the per-step usage the analysis child execution
 * recorded for its `analyze` step. Anything that stops the connector being read is reported
 * as `unresolvedReason`, never guessed.
 */
export const analysisUsageOf = (
  childExecutionId: string | undefined,
  child: WorkflowExecutionDto | undefined,
  fetchError?: string
): ReviewAnalysisUsage => {
  if (!childExecutionId) {
    return { connectorIds: [], unresolvedReason: 'the review recorded no analysis execution id' };
  }
  if (!child) {
    return {
      childExecutionId,
      connectorIds: [],
      unresolvedReason: `analysis execution could not be read${
        fetchError ? `: ${fetchError}` : ''
      }`,
    };
  }
  const entries = (child.stepUsage ?? []).filter(({ stepId }) => stepId === FP_TP_ANALYZE_STEP_ID);
  if (entries.length === 0) {
    return {
      childExecutionId,
      connectorIds: [],
      unresolvedReason: `analysis execution reported no usage for step ${FP_TP_ANALYZE_STEP_ID}`,
    };
  }
  const connectorIds = distinct(
    entries.map(({ connectorId }) =>
      connectorId && connectorId !== UNKNOWN_CONNECTOR ? connectorId : undefined
    )
  );
  // A field no entry reported stays undefined: a summed 0 would read as "reported zero tokens".
  const sum = (pick: (entry: (typeof entries)[number]) => number | undefined): number | undefined =>
    entries.some((entry) => pick(entry) !== undefined)
      ? entries.reduce((total, entry) => total + (pick(entry) ?? 0), 0)
      : undefined;
  const hasUnknown = entries.some(
    ({ connectorId }) => !connectorId || connectorId === UNKNOWN_CONNECTOR
  );
  return {
    childExecutionId,
    connectorIds,
    inputTokens: sum(({ inputTokens }) => inputTokens),
    outputTokens: sum(({ outputTokens }) => outputTokens),
    cachedTokens: sum(({ cachedTokens }) => cachedTokens),
    ...(hasUnknown
      ? { unresolvedReason: `step ${FP_TP_ANALYZE_STEP_ID} usage carried no connector id` }
      : {}),
  };
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

const readAnalysisUsage = async ({
  client,
  review,
  spaceId,
}: {
  client: AttackDiscoveryWorkerClient;
  review: WorkflowExecutionDto;
  spaceId: string;
}): Promise<ReviewAnalysisUsage | undefined> => {
  const step = firstStep(review, FP_TP_ANALYSIS_STEP_ID);
  if (!step) return undefined;
  const childExecutionId = asString(asRecord(step.state)?.executionId);
  if (!childExecutionId) return analysisUsageOf(undefined, undefined);
  try {
    return analysisUsageOf(childExecutionId, await client.getExecution(spaceId, childExecutionId));
  } catch (error) {
    return analysisUsageOf(
      childExecutionId,
      undefined,
      error instanceof Error ? error.message : String(error)
    );
  }
};

const buildReviewArtifact = async ({
  client,
  review,
  timedOutAfterMs,
  dispatch,
  fetch,
  spaceId,
}: {
  client: AttackDiscoveryWorkerClient;
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
  const analysisUsage = await readAnalysisUsage({ client, review, spaceId });

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
    ...(analysisUsage ? { analysis: analysisUsage } : {}),
  };
};

/**
 * Artifact of a review the row dispatched itself (seeded-false-positive): no dispatch step to read.
 */
export const collectReviewArtifact = async ({
  client,
  review,
  timedOutAfterMs,
  fetch,
  spaceId,
}: {
  client: AttackDiscoveryWorkerClient;
  review: WorkflowExecutionDto;
  timedOutAfterMs?: number;
  fetch: HttpHandler;
  spaceId: string;
}): Promise<ReviewArtifact> =>
  buildReviewArtifact({
    client,
    review,
    timedOutAfterMs,
    dispatch: undefined,
    fetch,
    spaceId,
  });

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

// The run step's refusal error (`handle_model_refusal`) and the inference plugin's content-filter
// refusal; either is the model declining, not the pipeline failing.
const MODEL_REFUSAL_PATTERN = /refused to complete the response|finish_reason: content_filter/i;
const RUN_BATCH_STEP_ID = 'run_batch';

/**
 * Error messages of the generation child's failed batches. `/children` omits step input and
 * output but keeps step errors, which is where a refused batch's reason survives. Undefined when
 * the children could not be read.
 */
const readBatchErrors = async ({
  client,
  run,
  spaceId,
  log,
}: {
  client: AttackDiscoveryWorkerClient;
  run: WorkflowExecutionDto;
  spaceId: string;
  log: ToolingLog;
}): Promise<string[] | undefined> => {
  try {
    const children = await client.getChildren(spaceId, run.id);
    return children
      .filter(({ workflowId }) => workflowId === BATCHED_GENERATION_WORKFLOW_ID)
      .flatMap(({ stepExecutions }) => stepExecutions)
      .filter(({ stepId }) => stepId === RUN_BATCH_STEP_ID)
      .flatMap(({ error }) => (error?.message ? [error.message] : []));
  } catch (error) {
    log.warning(
      `[ad-worker] run ${run.id}: could not read the generation batch errors: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/**
 * Why generation produced nothing, from the runner's own `ad_worker_run_completed` event: every
 * batch failed (`refused` only when each readable batch error is a model refusal), or every batch
 * succeeded over the alerts and the model found no attack (`empty`). Undefined otherwise.
 */
export const readGenerationFault = async ({
  client,
  run,
  spaceId,
  outcomes,
  log,
}: {
  client: AttackDiscoveryWorkerClient;
  run: WorkflowExecutionDto;
  spaceId: string;
  outcomes: WorkerOutcomeEvent[];
  log: ToolingLog;
}): Promise<GenerationFault | undefined> => {
  const event = outcomes.find(({ stepId }) => stepId === REPORT_RUN_COMPLETED_STEP_ID);
  const total = asNumber(event?.input?.batches_total) ?? 0;
  const failed = asNumber(event?.input?.batches_failed) ?? 0;
  if (
    event?.runOutcome === 'empty_no_attacks' &&
    total > 0 &&
    failed === 0 &&
    (asNumber(event.input?.alerts_analyzed) ?? 0) > 0
  ) {
    return { kind: 'empty' };
  }
  if (event?.runOutcome !== 'failed_all_batches' || total === 0 || failed < total) {
    return undefined;
  }
  const messages = (await readBatchErrors({ client, run, spaceId, log })) ?? [];
  const refused =
    messages.length > 0 && messages.every((message) => MODEL_REFUSAL_PATTERN.test(message));
  return { kind: refused ? 'refused' : 'failed', ...(messages[0] ? { message: messages[0] } : {}) };
};

const EXECUTION_UUID_FIELD = 'kibana.alert.rule.execution.uuid';

/**
 * Counts the persisted discoveries that carry this run's generation uuids: the same scope the
 * batched generation reads back, but a separate read from the runner's own output, so a count
 * the runner reports can be checked against the index. A missing index is an honest zero;
 * undefined means the count could not be read (or no uuids were reported to scope it).
 */
export const countIndexedAttacks = async ({
  esClient,
  spaceId,
  executionUuids,
  log,
}: {
  esClient: Client;
  spaceId: string;
  executionUuids: unknown;
  log: ToolingLog;
}): Promise<number | undefined> => {
  const uuids =
    typeof executionUuids === 'string'
      ? executionUuids
          .split(',')
          .map((uuid) => uuid.trim())
          .filter((uuid) => uuid !== '')
      : Array.isArray(executionUuids)
      ? strings(executionUuids)
          .map((uuid) => uuid.trim())
          .filter((uuid) => uuid !== '')
      : undefined;
  if (uuids === undefined) return undefined;
  if (uuids.length === 0) return 0;
  try {
    const { count } = await esClient.count({
      index: attackDiscoveryIndexForSpace(spaceId),
      query: { terms: { [EXECUTION_UUID_FIELD]: uuids } },
    });
    return count;
  } catch (error) {
    if (asRecord(asRecord(error)?.meta)?.statusCode === 404) return 0;
    log.warning(`[ad-worker] could not count persisted attacks: ${errorMessage(error)}`);
    return undefined;
  }
};

/**
 * Last-resort scope for the indexed count when neither runner output reported the generation
 * uuids: the uuids the persisted documents carry themselves. Undefined when none was read, so
 * the count stays unreadable instead of reporting a false zero.
 */
const persistedExecutionUuids = (
  docs: readonly Record<string, unknown>[]
): string[] | undefined => {
  const uuids = distinct(docs.map((doc) => asString(readField(doc, EXECUTION_UUID_FIELD))));
  return uuids.length > 0 ? uuids : undefined;
};

/** Every attack id `match_fingerprints` handed back, as a review or an attachment. */
const attackIdsOf = (matchOutput: Record<string, unknown> | undefined): string[] =>
  distinct(
    [matchOutput?.reviews, matchOutput?.attachments].flatMap((list) =>
      Array.isArray(list) ? list.map((item) => asString(asRecord(item)?.attack_discovery_id)) : []
    )
  );

/**
 * Fallback for a runner step output that did not carry the discovery documents: reads the
 * persisted attacks straight from the space's discovery index, by the ids the fingerprint matcher
 * returned and then by generation uuid. A read that fails returns nothing, so the evaluators
 * score what exists rather than the run erroring.
 */
const readPersistedAttacks = async ({
  esClient,
  spaceId,
  attackIds,
  executionUuids,
  log,
}: {
  esClient: Client;
  spaceId: string;
  attackIds: readonly string[];
  executionUuids: unknown;
  log: ToolingLog;
}): Promise<Record<string, unknown>[]> => {
  const uuids = strings(executionUuids);
  const filters = [
    ...(attackIds.length > 0 ? [{ ids: { values: [...attackIds] } }] : []),
    ...(uuids.length > 0 ? [{ terms: { [EXECUTION_UUID_FIELD]: uuids } }] : []),
  ];
  if (filters.length === 0) return [];
  try {
    const { hits } = await esClient.search<Record<string, unknown>>({
      index: attackDiscoveryIndexForSpace(spaceId),
      size: 1000,
      query: { bool: { should: filters, minimum_should_match: 1 } },
    });
    return hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  } catch (error) {
    log.warning(`[ad-worker] could not read persisted attacks: ${errorMessage(error)}`);
    return [];
  }
};

/** What `match_fingerprints` did with the attacks, read from its output. */
export interface FingerprintMatchSplit {
  /** `attack_discovery_id` of every review the matcher handed back. */
  reviewedAttackIds: string[];
  /** Attachments that are same-run siblings of a reviewed group (declared by a review). */
  siblingAttackIds: string[];
  /** Attachments to an Investigation that already existed. */
  existingAttachCount: number;
  attachCount: number;
}

/**
 * Splits the matcher's attachments. In a reviewed group the first attack is the review and the
 * rest are attached to the same new Investigation; the review lists them in
 * `sibling_attack_discovery_ids`. Any other attachment went to an existing fingerprint. The matcher
 * declares at most `MAX_ALERT_IDS` siblings per group, so a group larger than that would count its
 * extras as attaches; the datasets stay far below it.
 */
export const splitFingerprintMatch = (
  matchOutput: Record<string, unknown> | undefined
): FingerprintMatchSplit | undefined => {
  const reviews = matchOutput?.reviews;
  const attachments = matchOutput?.attachments;
  if (!Array.isArray(reviews) || !Array.isArray(attachments)) return undefined;
  const reviewRecords = reviews.map(asRecord);
  const declaredSiblings = new Set(
    reviewRecords.flatMap((review) => strings(review?.sibling_attack_discovery_ids))
  );
  const attachedIds = attachments.map((item) => asString(asRecord(item)?.attack_discovery_id));
  const siblingAttackIds = attachedIds.filter(
    (id): id is string => id !== undefined && declaredSiblings.has(id)
  );
  return {
    reviewedAttackIds: reviewRecords.flatMap(
      (review) => asString(review?.attack_discovery_id) ?? []
    ),
    siblingAttackIds,
    existingAttachCount: attachments.length - siblingAttackIds.length,
    attachCount: attachments.length,
  };
};

/**
 * Collects what one runner execution produced: the persisted discoveries, the fingerprint
 * match result, every review it dispatched (polled until it ends or parks at the analyst gate)
 * and the outcome events it reported.
 */
export const collectWorkerArtifacts = async ({
  client,
  esClient,
  run,
  runTimedOutAfterMs,
  spaceId,
  seeded,
  fetch,
  log,
}: {
  client: AttackDiscoveryWorkerClient;
  esClient: Client;
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
  const match = firstStep(run, MATCH_FINGERPRINTS_STEP_ID);
  const matchOutput = outputOf(match);
  // `run_generation` carries the discovery documents, so the engine can evict its whole output;
  // `emit_result` repeats the generation uuids as a small string and survives.
  const generationUuids = generation?.execution_uuids ?? emit?.execution_uuids;
  const reported = (
    Array.isArray(generation?.attack_discoveries) ? generation.attack_discoveries : []
  )
    .map(asRecord)
    .filter((doc): doc is Record<string, unknown> => doc !== undefined);
  const docs =
    reported.length > 0
      ? reported
      : await readPersistedAttacks({
          esClient,
          spaceId,
          attackIds: attackIdsOf(matchOutput),
          executionUuids: generationUuids,
          log,
        });
  if (reported.length === 0) {
    log.warning(
      `[ad-worker] run ${run.id}: run_generation output carried no attack_discoveries ` +
        `(step ${
          generation
            ? `output keys: ${Object.keys(generation).join(',') || 'none'}`
            : 'output missing'
        }); ` +
        `read ${docs.length} persisted attacks from the index instead`
    );
  }
  const { insights, ids } = toInsights(docs, seeded.goldIdBySeededId);
  const fingerprintSplit = splitFingerprintMatch(matchOutput);
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
      return buildReviewArtifact({
        client,
        review,
        timedOutAfterMs,
        dispatch: step,
        fetch,
        spaceId,
      });
    })
  );
  const indexedAttackCount = await countIndexedAttacks({
    esClient,
    spaceId,
    executionUuids: generationUuids ?? persistedExecutionUuids(docs),
    log,
  });
  const outcomes = outcomeEvents(run);
  const generationFault = await readGenerationFault({ client, run, spaceId, outcomes, log });
  log.info(
    `[ad-worker] run ${run.id}: ${insights.length} discoveries, ${
      reviews.length
    } reviews dispatched${generationFault ? ` (generation ${generationFault.kind})` : ''}`
  );

  return {
    runnerExecutionId: run.id,
    runnerStatus: run.status,
    runnerError: run.error?.message,
    runnerStepCount: run.stepExecutions.length,
    ...(runTimedOutAfterMs !== undefined ? { runnerTimedOutAfterMs: runTimedOutAfterMs } : {}),
    seededAlertCount: seeded.alertCount,
    seededAlertIds: [...seeded.goldIdBySeededId.values()],
    openAlertIds: seeded.openAlertIds,
    alertsAnalyzed: asNumber(generation?.alerts_analyzed) ?? asNumber(emit?.alerts_analyzed),
    attacksGenerated:
      asNumber(generation?.discoveries_generated) ?? asNumber(emit?.attacks_generated),
    reviewsRequested: asNumber(fanout?.attack_count) ?? asNumber(emit?.reviews_requested),
    insights,
    generationUsage: generationUsageOf(docs),
    persistedAttackIds: ids,
    ...(indexedAttackCount !== undefined ? { indexedAttackCount } : {}),
    fingerprintReviewCount: Array.isArray(matchOutput?.reviews)
      ? matchOutput.reviews.length
      : undefined,
    fingerprintAttachCount: fingerprintSplit?.attachCount,
    fingerprintExistingAttachCount: fingerprintSplit?.existingAttachCount,
    fingerprintSiblingAttackIds: fingerprintSplit?.siblingAttackIds,
    fingerprintReviewedAttackIds: fingerprintSplit?.reviewedAttackIds,
    fingerprintMatchedCount: Array.isArray(matchOutput?.reviews)
      ? matchOutput.reviews.filter(
          (item) => asString(asRecord(item)?.related_investigation_id) !== undefined
        ).length
      : undefined,
    fingerprintMatchFailed: matchFailed,
    dispatchedReviewExecutionIds: dispatches.map(({ executionId }) => executionId),
    reviews,
    outcomes,
    ...(generationFault ? { generationFault } : {}),
  };
};
