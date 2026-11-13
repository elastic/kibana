/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setImmediate as yieldToEventLoop } from 'timers/promises';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import {
  SESSIONS_INDEX,
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_MAX_ID_LENGTH,
  SESSIONS_MAX_SESSION_HOURS,
  SESSIONS_SYNC_DELAY_SECONDS,
} from '../../../common/sessions';
import { stringsOf } from '../../lib/helpers/values';
import { hashRanges } from './hash_ranges';
import type { SessionDocument } from './sessions_index';
import {
  ESQL_MAX_ROWS,
  SESSION_IDS_COLUMN,
  changedSessionIdsQuery,
  changedSessionsCountQuery,
  sessionSummaryQuery,
  type ChangedWindow,
  type SummaryQuery,
} from './summary_queries';
import {
  sessionDocumentId,
  toEsqlRows,
  toSessionDocuments,
  type EsqlRow,
} from './summary_documents';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Sessions rebuilt per summary query: half the ES|QL row limit, so reused session ids still fit. */
export const SESSIONS_PER_QUERY = ESQL_MAX_ROWS / 2;
/**
 * Changed session ids fetched per query. Each query aggregates the whole window, so fewer and larger
 * ones are cheaper: at 137,000 changed sessions, one query took 0.6s against 13s for one per 5,000.
 */
export const IDS_PER_QUERY = 100_000;
/** More changed sessions than this, and the window is halved: a run must finish its windows. */
export const MAX_SESSIONS_PER_WINDOW = 64 * SESSIONS_PER_QUERY;
export const MIN_WINDOW_MS = MINUTE_MS;
export const MAX_WINDOW_MS = DAY_MS;
/** The first window of a backfill; it then grows or shrinks with the sessions found. */
export const INITIAL_WINDOW_MS = HOUR_MS;
const BULK_SIZE = 2000;
/**
 * Summary rows turned into documents per tick. Mapping a full batch at once blocked a small Kibana's
 * event loop for about half a second, delaying its other requests and tasks.
 */
export const ROWS_PER_TICK = 500;

export interface SummarizeSessionsParams {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  now: number;
  /** Events before it are summarized; `null` to start from the lookback. */
  checkpoint: string | null;
  windowMs: number;
  /** Starts no window after this much time, so the run ends before its timeout. */
  budgetMs: number;
  /** Summary queries run at once, each with its own batch of sessions. */
  concurrency: number;
  logger: Logger;
}

export interface SummarizeSessionsResult {
  checkpoint: string;
  windowMs: number;
  /** True when every event up to the sync delay is summarized. */
  caughtUp: boolean;
  sessions: number;
}

const iso = (time: number): string => new Date(time).toISOString();

/** Midnight UTC `SESSIONS_LOOKBACK_DAYS` ago: older events are never summarized. */
export const lookbackStart = (now: number): number => {
  const start = new Date(now - SESSIONS_LOOKBACK_DAYS * DAY_MS);
  return Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
};

const queryEsql = (
  esClient: ElasticsearchClient,
  { query, params }: SummaryQuery,
  signal: AbortSignal
): Promise<estypes.EsqlEsqlResult> =>
  // A shard that fails fails the query, so a failure never writes partial summaries.
  esClient.esql.query({ query, params, allow_partial_results: false }, { signal });

const runEsql = async (
  esClient: ElasticsearchClient,
  query: SummaryQuery,
  signal: AbortSignal
): Promise<EsqlRow[]> => toEsqlRows(await queryEsql(esClient, query, signal));

/** The summaries of a summary query's rows, `ROWS_PER_TICK` at a time between event loop turns. */
const toSessionDocumentsInChunks = async ({
  columns,
  values,
}: estypes.EsqlEsqlResult): Promise<SessionDocument[]> => {
  const documents: SessionDocument[] = [];
  for (let start = 0; start < values.length; start += ROWS_PER_TICK) {
    await yieldToEventLoop();
    const rows = toEsqlRows({ columns, values: values.slice(start, start + ROWS_PER_TICK) });
    documents.push(...toSessionDocuments(rows));
  }
  return documents;
};

const countChangedSessions = async (
  esClient: ElasticsearchClient,
  window: ChangedWindow,
  signal: AbortSignal
): Promise<number> => {
  const [row] = await runEsql(esClient, changedSessionsCountQuery(window), signal);
  return typeof row?.sessions === 'number' ? row.sessions : 0;
};

/**
 * Whether another run could get past this bulk failure. Elasticsearch answers 400 when it refuses
 * the document itself, such as a value no mapping accepts, and every retry hits that again, so
 * those are left out rather than stalling the window and every session behind it. Anything else,
 * such as a 403 once the key loses access or a 429 from a busy cluster, is worth retrying.
 */
const isRetryable = (status: number | undefined): boolean => status !== 400;

const writeSessions = async (
  esClient: ElasticsearchClient,
  documents: SessionDocument[],
  signal: AbortSignal,
  logger: Logger
): Promise<void> => {
  for (let start = 0; start < documents.length; start += BULK_SIZE) {
    const operations = documents.slice(start, start + BULK_SIZE).flatMap((document) => [
      {
        index: {
          _index: SESSIONS_INDEX,
          _id: sessionDocumentId(document.service.name, document.session.id),
        },
      },
      document,
    ]);
    const response = await esClient.bulk({ operations }, { signal });
    if (!response.errors) {
      continue;
    }
    const failures = response.items.flatMap((item) => (item.index?.error ? [item.index] : []));
    const retryable = failures.find(({ status }) => isRetryable(status));
    if (retryable) {
      const { type, reason } = retryable.error ?? {};
      throw new Error(`Writing session summaries failed: ${type ?? 'unknown'}: ${reason ?? ''}`);
    }
    const [rejected] = failures;
    if (rejected) {
      const { type, reason } = rejected.error ?? {};
      logger.warn(
        `Elasticsearch rejected ${failures.length} session ${
          failures.length === 1 ? 'summary, which is' : 'summaries, which are'
        } left out: ${type ?? 'unknown'}: ${reason ?? ''}`
      );
    }
  }
};

/** The ids of the sessions with an event in the window, `IDS_PER_QUERY` hash range at a time. */
const changedSessionIds = async (
  esClient: ElasticsearchClient,
  window: ChangedWindow,
  changedSessions: number,
  signal: AbortSignal
): Promise<string[]> => {
  let ids: string[] = [];
  for (const range of hashRanges(Math.ceil(changedSessions / IDS_PER_QUERY))) {
    const rows = await runEsql(esClient, changedSessionIdsQuery(window, range), signal);
    // `concat`, as spreading 100,000 ids into `push` can overflow the call stack.
    ids = ids.concat(
      ...rows.map((row) =>
        // A longer id could be summarized but never opened, as the detail route refuses it.
        stringsOf(row[SESSION_IDS_COLUMN]).filter(({ length }) => length <= SESSIONS_MAX_ID_LENGTH)
      )
    );
  }
  return ids;
};

interface RebuildWindow {
  changedTo: string;
  rebuildFrom: string;
}

/** The sessions written, or the two halves of a batch whose rows filled the ES|QL response. */
type BatchResult = { written: number } | { halves: [string[], string[]] };

const summarizeBatch = async (
  esClient: ElasticsearchClient,
  window: RebuildWindow,
  batch: string[],
  signal: AbortSignal,
  logger: Logger
): Promise<BatchResult> => {
  const response = await queryEsql(esClient, sessionSummaryQuery(window, batch), signal);
  if (response.values.length >= ESQL_MAX_ROWS && batch.length > 1) {
    const half = Math.ceil(batch.length / 2);
    return { halves: [batch.slice(0, half), batch.slice(half)] };
  }
  const documents = await toSessionDocumentsInChunks(response);
  await writeSessions(esClient, documents, signal, logger);
  return { written: documents.length };
};

/**
 * Rebuilds the sessions of `ids` in batches whose rows fit an ES|QL response, `concurrency` at a
 * time; a batch that still fills one, as ids that several applications share have a row each, is
 * split in two. A failed batch fails the window once the others of its round are done.
 */
const summarizeSessionIds = async (
  esClient: ElasticsearchClient,
  window: RebuildWindow,
  ids: string[],
  signal: AbortSignal,
  concurrency: number,
  logger: Logger
): Promise<number> => {
  const batches = chunk(ids, SESSIONS_PER_QUERY);
  let written = 0;
  while (batches.length > 0) {
    const round = batches.splice(0, Math.max(1, concurrency));
    const results = await Promise.allSettled(
      round.map((batch) => summarizeBatch(esClient, window, batch, signal, logger))
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        throw result.reason;
      }
      if ('halves' in result.value) {
        batches.push(...result.value.halves);
      } else {
        written += result.value.written;
      }
    }
  }
  return written;
};

/**
 * Summarizes the sessions with events after the checkpoint, window by window, oldest first, until
 * it reaches the sync delay or runs out of time. Each window fetches the ids of its sessions, then
 * rebuilds them from up to the longest session before it, so a later window corrects the summaries
 * of an earlier one. The checkpoint only moves past a window once all of it is written.
 */
export const summarizeSessions = async ({
  esClient,
  signal,
  now,
  checkpoint,
  windowMs,
  budgetMs,
  concurrency,
  logger,
}: SummarizeSessionsParams): Promise<SummarizeSessionsResult> => {
  const until = now - SESSIONS_SYNC_DELAY_SECONDS * 1000;
  const earliest = lookbackStart(now);
  const deadline = Date.now() + budgetMs;
  let from = Math.max(checkpoint ? Date.parse(checkpoint) : earliest, earliest);
  let size = Math.min(Math.max(windowMs, MIN_WINDOW_MS), MAX_WINDOW_MS);
  let sessions = 0;

  while (from < until && Date.now() < deadline) {
    const to = Math.min(until, from + size);
    const window: ChangedWindow = { changedFrom: iso(from), changedTo: iso(to) };
    const changed = await countChangedSessions(esClient, window, signal);
    if (changed > MAX_SESSIONS_PER_WINDOW && to - from > MIN_WINDOW_MS) {
      size = Math.max(MIN_WINDOW_MS, Math.floor((to - from) / 2));
    } else {
      if (changed > 0) {
        const ids = await changedSessionIds(esClient, window, changed, signal);
        sessions += await summarizeSessionIds(
          esClient,
          {
            changedTo: window.changedTo,
            rebuildFrom: iso(Math.max(earliest, from - SESSIONS_MAX_SESSION_HOURS * HOUR_MS)),
          },
          ids,
          signal,
          concurrency,
          logger
        );
      }
      from = to;
      if (changed < MAX_SESSIONS_PER_WINDOW / 4) {
        size = Math.min(MAX_WINDOW_MS, size * 2);
      }
    }
  }

  return { checkpoint: iso(from), windowMs: size, caughtUp: from >= until, sessions };
};
