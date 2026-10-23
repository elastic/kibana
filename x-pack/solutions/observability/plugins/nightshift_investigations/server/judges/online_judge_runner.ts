/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { AppliedWriteRecord } from '../investigation_round';
import { withNightshiftBackgroundSpan } from '../tracing';

export const ONLINE_SCORES_DATA_STREAM = '.evaluation-online-scores';
export const NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID = 'system-nightshift-memory-judges';
export const NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME = 'Nightshift Memory Scheduled Judges';

export const READ_JUDGE_EVALUATOR_NAME = 'nightshift.memory_read_judge';
export const WRITE_JUDGE_EVALUATOR_NAME = 'nightshift.memory_write_judge';
export const DEFAULT_EVALUATOR_VERSION = 'v1';

export interface OnlineScoreRecord {
  '@timestamp'?: string;
  space_ids: string[];
  trace_id: string;
  monitor: {
    id: string;
    name: string;
  };
  evaluator: {
    name: string;
    version: string;
  };
  score: {
    name: string;
    value: number | null;
    label?: string;
    explanation?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface BulkCreateOnlineScoresSummary {
  created: number;
  skipped: number;
  errors: Array<{ index: number; status: number; reason: string }>;
}

/**
 * Computes the deterministic `.evaluation-online-scores` document `_id` matching Kibana Evals'
 * `OnlineScoreService` (`sha256(JSON.stringify([[...space_ids].sort(), monitor.id, trace_id, evaluator.name, evaluator.version, score.name]))`).
 *
 * Indexing with `op_type: 'create'` (`409 Conflict` -> `skipped`) guarantees that each
 * `(space_ids, monitor.id, trace_id, evaluator.name, evaluator.version, score.name)` tuple is
 * evaluated at most once, while bumping `evaluator.version` cleanly allows re-judging.
 */
export const computeOnlineScoreDocumentId = (
  document: Pick<OnlineScoreRecord, 'space_ids' | 'monitor' | 'trace_id' | 'evaluator' | 'score'>
): string => {
  const identity = JSON.stringify([
    [...document.space_ids].sort(),
    document.monitor.id,
    document.trace_id,
    document.evaluator.name,
    document.evaluator.version,
    document.score.name,
  ]);

  return createHash('sha256').update(identity, 'utf8').digest('hex');
};

const isIndexNotFoundError = (error: unknown): boolean => {
  if (!isResponseError(error) || typeof error.body?.error !== 'object') {
    return false;
  }
  return error.body.error?.type === 'index_not_found_exception';
};

const termOrKeywordFilter = (field: string, value: string) => ({
  bool: {
    should: [{ term: { [field]: value } }, { term: { [`${field}.keyword`]: value } }],
    minimum_should_match: 1,
  },
});

const termsOrKeywordFilter = (field: string, values: string[]) => ({
  bool: {
    should: [{ terms: { [field]: values } }, { terms: { [`${field}.keyword`]: values } }],
    minimum_should_match: 1,
  },
});

/**
 * Queries `.evaluation-online-scores` to find which candidate `trace_id`s already have a score
 * recorded for `(evaluatorName, evaluatorVersion, scoreName)` in `spaceId`.
 *
 * Uses `termOrKeywordFilter` so queries match both explicit Evals data-stream mappings
 * (`keyword`) and dynamically mapped `.evaluation-online-scores` indices (`text` + `.keyword`).
 */
export const findAlreadyJudgedTraceIds = async ({
  esClient,
  spaceId,
  traceIds,
  evaluatorName,
  evaluatorVersion,
  scoreName,
  monitorId = NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  traceIds: readonly string[];
  evaluatorName: string;
  evaluatorVersion: string;
  scoreName?: string;
  monitorId?: string;
  signal?: AbortSignal;
}): Promise<Set<string>> => {
  const uniqueTraceIds = [...new Set(traceIds.filter(Boolean))];
  if (uniqueTraceIds.length === 0) {
    return new Set();
  }

  try {
    const response = await esClient.search<{ trace_id?: string }>(
      {
        index: ONLINE_SCORES_DATA_STREAM,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: Math.min(uniqueTraceIds.length * 4, 1_000),
        _source: ['trace_id'],
        query: {
          bool: {
            filter: [
              termOrKeywordFilter('space_ids', spaceId),
              termOrKeywordFilter('monitor.id', monitorId),
              termsOrKeywordFilter('trace_id', uniqueTraceIds),
              termOrKeywordFilter('evaluator.name', evaluatorName),
              termOrKeywordFilter('evaluator.version', evaluatorVersion),
              ...(scoreName ? [termOrKeywordFilter('score.name', scoreName)] : []),
            ],
          },
        },
      },
      { signal }
    );

    const judged = new Set<string>();
    for (const hit of response.hits.hits) {
      if (hit._source?.trace_id) {
        judged.add(hit._source.trace_id);
      }
    }
    return judged;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return new Set();
    }
    throw error;
  }
};

/**
 * Writes online score documents to `.evaluation-online-scores` with `op_type: 'create'` and
 * deterministic SHA-256 document IDs so duplicate `(trace_id, evaluator.name, evaluator.version, score.name)`
 * entries are idempotently skipped (`409 Conflict`).
 */
export const ingestOnlineScores = async ({
  esClient,
  documents,
  logger,
  signal,
}: {
  esClient: ElasticsearchClient;
  documents: ReadonlyArray<Omit<OnlineScoreRecord, '@timestamp'>>;
  logger: Pick<Logger, 'warn' | 'debug'>;
  signal?: AbortSignal;
}): Promise<BulkCreateOnlineScoresSummary> => {
  if (documents.length === 0) {
    return { created: 0, skipped: 0, errors: [] };
  }

  const timestamp = new Date().toISOString();
  const operations = documents.flatMap((doc) => {
    const payload: OnlineScoreRecord = {
      '@timestamp': timestamp,
      ...doc,
    };
    const id = computeOnlineScoreDocumentId(payload);
    return [{ create: { _index: ONLINE_SCORES_DATA_STREAM, _id: id } }, payload];
  });

  const response = await esClient.bulk(
    {
      refresh: 'wait_for',
      operations,
    },
    { signal }
  );

  let skipped = 0;
  const errors: Array<{ index: number; status: number; reason: string }> = [];

  (response.items ?? []).forEach((item, index) => {
    const createItem = item.create;
    const status = createItem?.status;
    if (!status) {
      errors.push({ index, status: 500, reason: 'unknown failure reason' });
      return;
    }
    if (status === 409) {
      skipped += 1;
      return;
    }
    if (status < 200 || status >= 300) {
      errors.push({
        index,
        status,
        reason: createItem.error?.reason ?? createItem.error?.type ?? 'unknown failure reason',
      });
    }
  });

  if (errors.length > 0) {
    logger.warn(
      `Nightshift scheduled judge score ingestion had ${errors.length} failure(s): ${errors
        .map((e) => e.reason)
        .join('; ')}`
    );
  }

  return {
    created: documents.length - skipped - errors.length,
    skipped,
    errors,
  };
};

export interface CandidateBackgroundRound {
  traceId: string;
  foregroundTraceId?: string;
  roundId?: string;
  conversationId?: string;
  workflowExecutionId?: string;
  recalledIds: string[];
  openedIds: string[];
  appliedWrites: AppliedWriteRecord[];
}

const parseJsonArrayAttr = <T>(raw: unknown): T[] => {
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

interface RawTraceSpanDoc {
  trace_id?: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

const readAttr = (attrs: Record<string, unknown> | undefined, key: string): unknown => {
  if (!attrs) return undefined;
  if (key in attrs) return attrs[key];
  const parts = key.split('.');
  let cur: unknown = attrs;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
};

/**
 * Queries `traces-agent_builder.otel-<spaceId>` for recent `T_background` spans (`nightshift.*`)
 * within `[now - windowMinutes - lagMinutes, now - lagMinutes]` and groups them into candidate
 * background rounds.
 */
export const fetchCandidateBackgroundRounds = async ({
  esClient,
  spaceId,
  windowMinutes = 60,
  lagMinutes = 2,
  maxCandidates = 100,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  windowMinutes?: number;
  lagMinutes?: number;
  maxCandidates?: number;
  signal?: AbortSignal;
}): Promise<CandidateBackgroundRound[]> => {
  const index = `traces-agent_builder.otel-${spaceId}`;
  const totalWindowMinutes = windowMinutes + lagMinutes;

  try {
    const response = await esClient.search<RawTraceSpanDoc>(
      {
        index,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: Math.min(maxCandidates * 6, 1_000),
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: `now-${totalWindowMinutes}m`,
                    lt: `now-${lagMinutes}m`,
                  },
                },
              },
              { exists: { field: 'attributes.nightshift.background_trace_id' } },
            ],
          },
        },
      },
      { signal }
    );

    const byTraceId = new Map<
      string,
      {
        traceId: string;
        foregroundTraceId?: string;
        roundId?: string;
        conversationId?: string;
        workflowExecutionId?: string;
        recalledIds: Set<string>;
        openedIds: Set<string>;
        appliedWrites: AppliedWriteRecord[];
      }
    >();

    for (const hit of response.hits.hits) {
      const source = hit._source;
      if (!source) continue;
      const attrs = source.attributes;
      const bgTraceId = String(
        readAttr(attrs, 'nightshift.background_trace_id') ?? source.trace_id ?? ''
      ).trim();
      if (!bgTraceId) continue;

      let entry = byTraceId.get(bgTraceId);
      if (!entry) {
        if (byTraceId.size >= maxCandidates) continue;
        entry = {
          traceId: bgTraceId,
          recalledIds: new Set<string>(),
          openedIds: new Set<string>(),
          appliedWrites: [],
        };
        byTraceId.set(bgTraceId, entry);
      }

      const fgTrace = readAttr(attrs, 'nightshift.foreground_trace_id');
      if (typeof fgTrace === 'string' && fgTrace) entry.foregroundTraceId ??= fgTrace;

      const roundId = readAttr(attrs, 'nightshift.round_id');
      if (typeof roundId === 'string' && roundId) entry.roundId ??= roundId;

      const nsConvId = readAttr(attrs, 'nightshift.conversation_id');
      const convId =
        typeof nsConvId === 'string' && nsConvId
          ? nsConvId
          : readAttr(attrs, 'gen_ai.conversation.id');
      if (typeof convId === 'string' && convId) {
        if (typeof nsConvId === 'string' && nsConvId) {
          entry.conversationId = nsConvId;
        } else {
          entry.conversationId ??= convId;
        }
      }

      const wfExecId = readAttr(attrs, 'nightshift.workflow_execution_id');
      if (typeof wfExecId === 'string' && wfExecId) entry.workflowExecutionId ??= wfExecId;

      for (const id of parseJsonArrayAttr<string>(readAttr(attrs, 'nightshift.recalled_ids'))) {
        if (typeof id === 'string') entry.recalledIds.add(id);
      }
      for (const id of parseJsonArrayAttr<string>(readAttr(attrs, 'nightshift.opened_ids'))) {
        if (typeof id === 'string') entry.openedIds.add(id);
      }
      for (const id of parseJsonArrayAttr<string>(readAttr(attrs, 'nightshift.opened_tree_ids'))) {
        if (typeof id === 'string') entry.openedIds.add(id);
      }
      for (const write of parseJsonArrayAttr<AppliedWriteRecord>(
        readAttr(attrs, 'nightshift.applied_writes')
      )) {
        if (write && typeof write === 'object' && typeof write.item_id === 'string') {
          entry.appliedWrites.push(write);
        }
      }
    }

    return [...byTraceId.values()].map((entry) => ({
      traceId: entry.traceId,
      ...(entry.foregroundTraceId ? { foregroundTraceId: entry.foregroundTraceId } : {}),
      ...(entry.roundId ? { roundId: entry.roundId } : {}),
      ...(entry.conversationId ? { conversationId: entry.conversationId } : {}),
      ...(entry.workflowExecutionId ? { workflowExecutionId: entry.workflowExecutionId } : {}),
      recalledIds: [...entry.recalledIds],
      openedIds: [...entry.openedIds],
      appliedWrites: entry.appliedWrites,
    }));
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};

/**
 * Deterministic hash-based subsampling in `[0, 1]` so a trace is consistently sampled or skipped
 * for a given `sampleRate`.
 */
export const shouldSampleTrace = (traceId: string, sampleRate: number): boolean => {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  const digest = createHash('sha256').update(traceId, 'utf8').digest();
  const fraction = digest.readUInt32BE(0) / 0xffffffff;
  return fraction < sampleRate;
};

export type EvaluateReadCandidate = (candidate: CandidateBackgroundRound) => Promise<{
  value: number;
  label: string;
  explanation: string;
  reasonCode: string;
}>;

export type EvaluateWriteCandidate = (
  candidate: CandidateBackgroundRound,
  write: AppliedWriteRecord
) => Promise<{
  value: number;
  label: string;
  explanation: string;
  reasonCode: string;
}>;

const defaultEvaluateRead: EvaluateReadCandidate = async (candidate) => {
  const recalledSet = new Set(candidate.recalledIds);
  const openedRecalled = candidate.openedIds.filter((id) => recalledSet.has(id));
  const precision =
    candidate.recalledIds.length > 0 ? openedRecalled.length / candidate.recalledIds.length : 0;
  return {
    value: Number(precision.toFixed(4)),
    label: openedRecalled.length > 0 ? 'opened' : 'unopened',
    explanation: `Agent opened ${openedRecalled.length} of ${candidate.recalledIds.length} recalled/hydrated items.`,
    reasonCode: openedRecalled.length > 0 ? 'RECALLED_OPENED' : 'RECALLED_NOT_OPENED',
  };
};

const defaultEvaluateWrite: EvaluateWriteCandidate = async (_candidate, write) => {
  const hasAfterContent = Boolean(write.after_content && write.after_content.trim().length > 0);
  const isArchive = write.action.startsWith('archive');
  const valid = isArchive || hasAfterContent;
  return {
    value: valid ? 1 : 0,
    label: valid ? 'pass' : 'empty_write',
    explanation: valid
      ? `Applied ${write.action} on ${write.store}:${write.item_id}.`
      : `Write ${write.action} on ${write.store}:${write.item_id} had empty after_content.`,
    reasonCode: valid ? 'WRITE_GROUNDED' : 'EMPTY_AFTER_CONTENT',
  };
};

export interface RunScheduledMemoryJudgesOptions {
  esClient: ElasticsearchClient;
  spaceId: string;
  windowMinutes?: number;
  lagMinutes?: number;
  maxTracesPerRun?: number;
  sampleRate?: number;
  evaluatorVersion?: string;
  monitorId?: string;
  monitorName?: string;
  candidatesOverride?: readonly CandidateBackgroundRound[];
  evaluateRead?: EvaluateReadCandidate;
  evaluateWrite?: EvaluateWriteCandidate;
  logger: Pick<Logger, 'info' | 'warn' | 'debug' | 'error'>;
  signal?: AbortSignal;
}

export interface ScheduledMemoryJudgesRunSummary {
  scannedCount: number;
  sampledCount: number;
  createdScoresCount: number;
  skippedDuplicateCount: number;
  errorCount: number;
}

/**
 * Runs a scheduled judge pass over recent `T_background` traces:
 *  1. Fetches candidate rounds from `traces-agent_builder.otel-<spaceId>` (or `candidatesOverride`).
 *  2. Filters out traces already judged under `(evaluatorName, evaluatorVersion)` in `.evaluation-online-scores`.
 *  3. Applies deterministic subsampling (`sampleRate`) and `maxTracesPerRun` cap.
 *  4. Emits `nightshift.readJudge` and `nightshift.writeJudge` spans under each candidate's `T_background`.
 *  5. Writes versioned scores into `.evaluation-online-scores` with SHA-256 deduplication (`409` -> `skipped`).
 */
export const runScheduledMemoryJudges = async ({
  esClient,
  spaceId,
  windowMinutes = 60,
  lagMinutes = 2,
  maxTracesPerRun = 20,
  sampleRate = 1.0,
  evaluatorVersion = DEFAULT_EVALUATOR_VERSION,
  monitorId = NIGHTSHIFT_MEMORY_JUDGES_MONITOR_ID,
  monitorName = NIGHTSHIFT_MEMORY_JUDGES_MONITOR_NAME,
  candidatesOverride,
  evaluateRead = defaultEvaluateRead,
  evaluateWrite = defaultEvaluateWrite,
  logger,
  signal,
}: RunScheduledMemoryJudgesOptions): Promise<ScheduledMemoryJudgesRunSummary> => {
  const candidates =
    candidatesOverride ??
    (await fetchCandidateBackgroundRounds({
      esClient,
      spaceId,
      windowMinutes,
      lagMinutes,
      maxCandidates: Math.max(maxTracesPerRun * 4, 50),
      signal,
    }));

  if (candidates.length === 0) {
    return {
      scannedCount: 0,
      sampledCount: 0,
      createdScoresCount: 0,
      skippedDuplicateCount: 0,
      errorCount: 0,
    };
  }

  const candidateTraceIds = candidates.map((c) => c.traceId);
  const [alreadyReadJudged, alreadyWriteJudged] = await Promise.all([
    findAlreadyJudgedTraceIds({
      esClient,
      spaceId,
      traceIds: candidateTraceIds,
      evaluatorName: READ_JUDGE_EVALUATOR_NAME,
      evaluatorVersion,
      monitorId,
      signal,
    }),
    findAlreadyJudgedTraceIds({
      esClient,
      spaceId,
      traceIds: candidateTraceIds,
      evaluatorName: WRITE_JUDGE_EVALUATOR_NAME,
      evaluatorVersion,
      monitorId,
      signal,
    }),
  ]);

  const unjudged = candidates.filter((candidate) => {
    const needsReadJudge =
      (candidate.recalledIds.length > 0 || candidate.openedIds.length > 0) &&
      !alreadyReadJudged.has(candidate.traceId);
    const needsWriteJudge =
      candidate.appliedWrites.length > 0 && !alreadyWriteJudged.has(candidate.traceId);
    return needsReadJudge || needsWriteJudge;
  });

  const sampled = unjudged
    .filter((candidate) => shouldSampleTrace(candidate.traceId, sampleRate))
    .slice(0, maxTracesPerRun);

  const scoreDocuments: Array<Omit<OnlineScoreRecord, '@timestamp'>> = [];

  for (const candidate of sampled) {
    if (signal?.aborted) break;

    if (
      (candidate.recalledIds.length > 0 || candidate.openedIds.length > 0) &&
      !alreadyReadJudged.has(candidate.traceId)
    ) {
      const readVerdict = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.readJudge',
          traceId: candidate.traceId,
          foregroundTraceId: candidate.foregroundTraceId,
          roundId: candidate.roundId,
          conversationId: candidate.conversationId,
          spaceId,
          workflowExecutionId: candidate.workflowExecutionId,
          logger,
          attributes: {
            'evaluator.name': READ_JUDGE_EVALUATOR_NAME,
            'evaluator.version': evaluatorVersion,
          },
        },
        async () => evaluateRead(candidate)
      );

      scoreDocuments.push({
        space_ids: [spaceId],
        trace_id: candidate.traceId,
        monitor: { id: monitorId, name: monitorName },
        evaluator: { name: READ_JUDGE_EVALUATOR_NAME, version: evaluatorVersion },
        score: {
          name: 'memory_read_utility',
          value: readVerdict.value,
          label: readVerdict.label,
          explanation: readVerdict.explanation,
          metadata: {
            ...(candidate.roundId ? { round_id: candidate.roundId } : {}),
            ...(candidate.conversationId ? { conversation_id: candidate.conversationId } : {}),
            ...(candidate.foregroundTraceId
              ? { foreground_trace_id: candidate.foregroundTraceId }
              : {}),
            recalled_count: candidate.recalledIds.length,
            opened_count: candidate.openedIds.length,
            reason_code: readVerdict.reasonCode,
          },
        },
      });
    }

    if (candidate.appliedWrites.length > 0 && !alreadyWriteJudged.has(candidate.traceId)) {
      for (const write of candidate.appliedWrites) {
        const writeVerdict = await withNightshiftBackgroundSpan(
          {
            name: 'nightshift.writeJudge',
            traceId: candidate.traceId,
            foregroundTraceId: candidate.foregroundTraceId,
            roundId: candidate.roundId,
            conversationId: candidate.conversationId,
            spaceId,
            workflowExecutionId: candidate.workflowExecutionId,
            logger,
            attributes: {
              'evaluator.name': WRITE_JUDGE_EVALUATOR_NAME,
              'evaluator.version': evaluatorVersion,
              'nightshift.memory_store': write.store,
              'nightshift.item_id': write.item_id,
            },
          },
          async () => evaluateWrite(candidate, write)
        );

        scoreDocuments.push({
          space_ids: [spaceId],
          trace_id: candidate.traceId,
          monitor: { id: monitorId, name: monitorName },
          evaluator: { name: WRITE_JUDGE_EVALUATOR_NAME, version: evaluatorVersion },
          score: {
            name: `memory_write_quality:${write.store}:${write.item_id}`,
            value: writeVerdict.value,
            label: writeVerdict.label,
            explanation: writeVerdict.explanation,
            metadata: {
              ...(candidate.roundId ? { round_id: candidate.roundId } : {}),
              ...(candidate.conversationId ? { conversation_id: candidate.conversationId } : {}),
              ...(candidate.foregroundTraceId
                ? { foreground_trace_id: candidate.foregroundTraceId }
                : {}),
              memory_store: write.store,
              item_id: write.item_id,
              action: write.action,
              ...(write.version !== undefined ? { version: write.version } : {}),
              reason_code: writeVerdict.reasonCode,
            },
          },
        });
      }
    }
  }

  const ingestResult = await ingestOnlineScores({
    esClient,
    documents: scoreDocuments,
    logger,
    signal,
  });

  return {
    scannedCount: candidates.length,
    sampledCount: sampled.length,
    createdScoresCount: ingestResult.created,
    skippedDuplicateCount: ingestResult.skipped,
    errorCount: ingestResult.errors.length,
  };
};
