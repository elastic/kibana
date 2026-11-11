/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { chunk } from 'lodash';
import {
  SESSIONS_INDEX,
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_MAX_SESSION_HOURS,
  SESSIONS_SYNC_DELAY_SECONDS,
} from '../../../common/sessions';
import { hashRanges, splitHashRange, type HashRange } from './hash_ranges';
import type { SessionDocument } from './sessions_index';
import {
  ESQL_MAX_ROWS,
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

/** Half the ES|QL row limit, so an uneven hash range or a reused session id still fits. */
export const SESSIONS_PER_QUERY = ESQL_MAX_ROWS / 2;
/** More changed sessions than this, and the window is halved: a run must finish its windows. */
export const MAX_SESSIONS_PER_WINDOW = 64 * SESSIONS_PER_QUERY;
export const MIN_WINDOW_MS = MINUTE_MS;
export const MAX_WINDOW_MS = DAY_MS;
/** The first window of a backfill; it then grows or shrinks with the sessions found. */
export const INITIAL_WINDOW_MS = HOUR_MS;
const BULK_SIZE = 2000;

export interface SummarizeSessionsParams {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  now: number;
  /** Events before it are summarized; `null` to start from the lookback. */
  checkpoint: string | null;
  windowMs: number;
  /** Starts no window after this much time, so the run ends before its timeout. */
  budgetMs: number;
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

const runEsql = async (
  esClient: ElasticsearchClient,
  { query, params }: SummaryQuery,
  signal: AbortSignal
): Promise<EsqlRow[]> =>
  toEsqlRows(
    // A shard that fails fails the query, so a failure never writes partial summaries.
    await esClient.esql.query({ query, params, allow_partial_results: false }, { signal })
  );

const countChangedSessions = async (
  esClient: ElasticsearchClient,
  window: ChangedWindow,
  signal: AbortSignal
): Promise<number> => {
  const [row] = await runEsql(esClient, changedSessionsCountQuery(window), signal);
  return typeof row?.sessions === 'number' ? row.sessions : 0;
};

const writeSessions = async (
  esClient: ElasticsearchClient,
  documents: SessionDocument[],
  signal: AbortSignal
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
    if (response.errors) {
      const failed = response.items.find((item) => item.index?.error)?.index?.error;
      throw new Error(
        `Writing session summaries failed: ${failed?.type ?? 'unknown'}: ${failed?.reason ?? ''}`
      );
    }
  }
};

/**
 * The ids of the sessions with an event in the window, in hash ranges that each fit an ES|QL
 * response. A range that still fills one is split in two and queried again.
 */
const changedSessionIds = async (
  esClient: ElasticsearchClient,
  window: ChangedWindow,
  changedSessions: number,
  signal: AbortSignal
): Promise<string[]> => {
  const ranges: HashRange[] = hashRanges(Math.ceil(changedSessions / SESSIONS_PER_QUERY));
  const ids: string[] = [];
  for (let range = ranges.shift(); range; range = ranges.shift()) {
    const rows = await runEsql(esClient, changedSessionIdsQuery(window, range), signal);
    if (rows.length >= ESQL_MAX_ROWS) {
      const halves = splitHashRange(range);
      if (!halves) {
        throw new Error(`Too many sessions share one hash prefix after ${window.changedFrom}`);
      }
      ranges.push(...halves);
    } else {
      ids.push(...rows.flatMap(({ session_id: id }) => (typeof id === 'string' && id ? [id] : [])));
    }
  }
  return ids;
};

/**
 * Rebuilds the sessions of `ids` in batches whose rows fit an ES|QL response; a batch that still
 * fills one, as ids that several applications share have a row each, is split in two.
 */
const summarizeSessionIds = async (
  esClient: ElasticsearchClient,
  window: { changedTo: string; rebuildFrom: string },
  ids: string[],
  signal: AbortSignal
): Promise<number> => {
  const batches = chunk(ids, SESSIONS_PER_QUERY);
  let written = 0;
  for (let batch = batches.shift(); batch; batch = batches.shift()) {
    const rows = await runEsql(esClient, sessionSummaryQuery(window, batch), signal);
    if (rows.length >= ESQL_MAX_ROWS && batch.length > 1) {
      const half = Math.ceil(batch.length / 2);
      batches.push(batch.slice(0, half), batch.slice(half));
    } else {
      const documents = toSessionDocuments(rows);
      await writeSessions(esClient, documents, signal);
      written += documents.length;
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
          signal
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
