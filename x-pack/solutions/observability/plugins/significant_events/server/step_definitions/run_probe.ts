/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { ProbeStatus } from '@kbn/significant-events-schema';
import { canCompileMatchMetric } from '../lib/significant_events/rules/can_compile_match_metric';
import type { ProbeOutcome } from './classify_detection';

export interface ProbeWindow {
  /** Inclusive ISO start, bound to `?_tstart`. */
  from: string;
  /** Exclusive ISO end, bound to `?_tend`. */
  to: string;
}

export interface ProbeResult extends ProbeOutcome {
  durationMs: number;
}

export interface StoredQueryResult {
  status: ProbeStatus;
  values: FieldValue[][];
  durationMs: number;
}

const STARTS_WITH_FROM = /^\s*FROM\s/i;

/**
 * A stored query can be re-run only when it is a bounded, filter-only `FROM` query that takes both
 * time placeholders. An aggregating query always returns a row, so "has rows" would say nothing.
 */
export const isProbeableQuery = (query: string | undefined): query is string =>
  query !== undefined &&
  query.length <= MAX_TEXT_LENGTH &&
  STARTS_WITH_FROM.test(query) &&
  query.includes('?_tstart') &&
  query.includes('?_tend') &&
  canCompileMatchMetric(query);

// The ES client types `params` as positional values; named parameters (`?_tstart`) are accepted by
// the API, the same known typing gap `toEsqlRequest` bridges for composed queries.
const toRequest = ({ query, tail, window }: { query: string; tail: string; window: ProbeWindow }) =>
  ({
    // A new line before the pipe, so a stored query ending in a `//` comment cannot swallow it.
    query: `${query.trimEnd()}\n| ${tail}`,
    params: [{ _tstart: window.from }, { _tend: window.to }],
  } as unknown as EsqlQueryRequest);

/**
 * Re-runs a rule's stored verification query over `window`, with `tail` as its last command, and
 * returns the rows.
 *
 * Never throws: a missing or unusable query, an abort, a timeout or any ES error becomes a
 * non-`ok` status. The deadline and the abort signal are checked before the request is issued, so
 * probes queued behind a spent budget or a cancelled step cost nothing.
 */
export const runStoredQuery = async ({
  esClient,
  query,
  tail,
  window,
  timeoutMs,
  deadlineAt,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  query: string | undefined;
  /** The command appended to the stored query, for example `LIMIT 1`. */
  tail: string;
  window: ProbeWindow;
  /** Per-probe timeout; also capped by the time left until `deadlineAt`. */
  timeoutMs: number;
  /** Shared deadline for every probe of a step execution, as epoch milliseconds. */
  deadlineAt: number;
  /** The step's own abort signal. */
  abortSignal: AbortSignal;
}): Promise<StoredQueryResult> => {
  const startedAt = Date.now();
  const finish = (status: ProbeStatus, values: FieldValue[][] = []): StoredQueryResult => ({
    status,
    values,
    durationMs: Date.now() - startedAt,
  });

  if (!isProbeableQuery(query)) return finish('no_query');
  if (abortSignal.aborted) return finish('aborted');
  const remainingMs = deadlineAt - startedAt;
  if (remainingMs <= 0) return finish('timeout');

  const timeoutSignal = AbortSignal.timeout(Math.min(timeoutMs, remainingMs));
  try {
    const response = await esClient.esql.query(toRequest({ query, tail, window }), {
      signal: AbortSignal.any([abortSignal, timeoutSignal]),
    });
    return finish('ok', response.values);
  } catch {
    if (abortSignal.aborted) return finish('aborted');
    if (timeoutSignal.aborted) return finish('timeout');
    return finish('error');
  }
};

/** Runs a stored query over a window; the step supplies the client, timeout and deadline. */
export type StoredQueryRunner = (params: {
  query: string | undefined;
  tail: string;
  window: ProbeWindow;
}) => Promise<StoredQueryResult>;

/** Reports whether a rule's stored query still returns rows over `window`. */
export const runProbe = async ({
  query,
  window,
  run,
}: {
  query: string | undefined;
  window: ProbeWindow;
  run: StoredQueryRunner;
}): Promise<ProbeResult> => {
  const { status, values, durationMs } = await run({ query, window, tail: 'LIMIT 1' });
  return { status, hasRows: values.length > 0, durationMs };
};
