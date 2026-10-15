/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { ProbeOutcome, ProbeStatus } from './classify_detection';

export interface ProbeWindow {
  /** Inclusive ISO start, bound to `?_tstart`. */
  from: string;
  /** Exclusive ISO end, bound to `?_tend`. */
  to: string;
}

export interface ProbeResult extends ProbeOutcome {
  durationMs: number;
}

const STARTS_WITH_FROM = /^\s*FROM\s/i;

/**
 * A stored query can be re-run only when it is a bounded `FROM` query that takes both time
 * placeholders; anything else cannot be re-run over a fresh window.
 */
export const isProbeableQuery = (query: string | undefined): query is string =>
  query !== undefined &&
  query.length <= MAX_TEXT_LENGTH &&
  STARTS_WITH_FROM.test(query) &&
  query.includes('?_tstart') &&
  query.includes('?_tend');

// The ES client types `params` as positional values; named parameters (`?_tstart`) are accepted by
// the API, the same known typing gap `toEsqlRequest` bridges for composed queries.
const toProbeRequest = ({ query, window }: { query: string; window: ProbeWindow }) =>
  ({
    query: `${query.trimEnd()} | LIMIT 1`,
    params: [{ _tstart: window.from }, { _tend: window.to }],
  } as unknown as EsqlQueryRequest);

/**
 * Re-runs a rule's stored verification query over `window` and reports whether it returns rows.
 *
 * Never throws: a missing or unusable query, an abort, a timeout or any ES error becomes a
 * non-`ok` status. The deadline and the abort signal are checked before the request is issued, so
 * probes queued behind a spent budget or a cancelled step cost nothing.
 */
export const runProbe = async ({
  esClient,
  query,
  window,
  timeoutMs,
  deadlineAt,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  query: string | undefined;
  window: ProbeWindow;
  /** Per-probe timeout; also capped by the time left until `deadlineAt`. */
  timeoutMs: number;
  /** Shared deadline for every probe of a step execution, as epoch milliseconds. */
  deadlineAt: number;
  /** The step's own abort signal. */
  abortSignal: AbortSignal;
}): Promise<ProbeResult> => {
  const startedAt = Date.now();
  const finish = (status: ProbeStatus, hasRows = false): ProbeResult => ({
    status,
    hasRows,
    durationMs: Date.now() - startedAt,
  });

  if (!isProbeableQuery(query)) return finish('no_query');
  if (abortSignal.aborted) return finish('aborted');
  const remainingMs = deadlineAt - startedAt;
  if (remainingMs <= 0) return finish('timeout');

  const timeoutSignal = AbortSignal.timeout(Math.min(timeoutMs, remainingMs));
  try {
    const response = await esClient.esql.query(toProbeRequest({ query, window }), {
      signal: AbortSignal.any([abortSignal, timeoutSignal]),
    });
    return finish('ok', response.values.length > 0);
  } catch {
    if (abortSignal.aborted) return finish('aborted');
    if (timeoutSignal.aborted) return finish('timeout');
    return finish('error');
  }
};
