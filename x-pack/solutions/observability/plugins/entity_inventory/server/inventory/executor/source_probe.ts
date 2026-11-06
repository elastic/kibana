/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildProbeQuery } from '../generator';
import { isVerificationError, toSourceError } from './errors/source_error';
import { executeEsql } from './esql_client';
import type { EsqlQueryResult } from './esql_client';

// The only question the executor asks Elasticsearch before the list queries. On purpose it makes
// no metadata calls (no resolve-index, `_has_privileges` or field capabilities) and never learns a
// concrete index name: Elasticsearch applies privileges and alias filters when the queries run, and
// each result is read afterwards for what the query could not do (plan_result.ts). Outcomes:
//
//   `@timestamp` of any type but `null`     a readable time-series index exists   TS and FROM plans
//   `@timestamp` typed `null`               none readable, or none at all         FROM plan only
//   `verification_exception`                a concrete index that is not time     FROM plan only
//                                           series (the FROM plan reads it), or a
//                                           name that does not exist (the FROM
//                                           plan then fails visibly)
//   any other failure                       unknown; reported as a source error   no plan runs
//
// The first row accepts any type but `null`: `TS` resolves only time-series indices, and the column
// is `null` only when none of them maps `@timestamp`, so any other type means one exists. Were the
// type ever unexpected, the TS plan would fail visibly, where reading it as "none" would have the
// FROM plan silently drop those indices. (A mix of `date` and `date_nanos` indices probes as
// `date_nanos` on 9.6.)
//
// The last row matters for the same reason: the FROM plan excludes time-series indices, so reading
// a timeout or a rejection as "no time-series index" would silently drop them. The error class
// comes from the response body's `error.type`, never from the message, which is undocumented and
// may change.

/** What the probe found behind one pattern, or why it could not tell. */
export type ProbeResult =
  | { failed: false; hasTimeSeries: boolean }
  | { failed: true; status: number | null; reason: string };

const TIMESTAMP_COLUMN = '@timestamp';

const fromResponse = ({ columns }: EsqlQueryResult): ProbeResult => {
  const timestamp = columns.find(({ name }) => name === TIMESTAMP_COLUMN);
  return {
    failed: false,
    hasTimeSeries: timestamp !== undefined && timestamp.type !== 'null',
  };
};

// A concrete index that is not time series and a name that does not exist both fail verification,
// and both mean there is no time-series index. Any other failure is not that answer: the `FROM`
// plan excludes time-series indices, so reading it as "none" would silently leave them out.
const fromError = (pattern: string, error: unknown): ProbeResult => {
  if (isVerificationError(error)) {
    return { failed: false, hasTimeSeries: false };
  }
  const { status, reason } = toSourceError(pattern, error);
  return { failed: true, status, reason };
};

/**
 * Runs the probe once per distinct pattern, concurrently, and tells for each whether a readable
 * time-series index exists behind it.
 */
export const probeSources = async (
  client: ElasticsearchClient,
  patterns: string[],
  { signal }: { signal?: AbortSignal } = {}
): Promise<Map<string, ProbeResult>> => {
  const unique = [...new Set(patterns)];
  // Build every probe before sending any, so a pattern that throws cannot leave earlier requests
  // in flight with no rejection handler.
  const probes = unique.map((pattern) => buildProbeQuery(pattern));
  const settled = await Promise.allSettled(
    probes.map((probe) => executeEsql(client, probe, { signal }))
  );
  return new Map(
    unique.map((pattern, position): [string, ProbeResult] => {
      const outcome = settled[position];
      return [
        pattern,
        outcome.status === 'fulfilled'
          ? fromResponse(outcome.value)
          : fromError(pattern, outcome.reason),
      ];
    })
  );
};
