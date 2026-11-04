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

/** What the probe found behind one pattern, or why it could not tell. */
export type ProbeResult =
  | { failed: false; hasTimeSeries: boolean }
  | { failed: true; status: number | null; reason: string };

const TIMESTAMP_COLUMN = '@timestamp';
const TIME_SERIES_TIMESTAMP_TYPES: ReadonlySet<string> = new Set(['date', 'date_nanos']);

const fromResponse = ({ columns }: EsqlQueryResult): ProbeResult => {
  const timestamp = columns.find(({ name }) => name === TIMESTAMP_COLUMN);
  return {
    failed: false,
    hasTimeSeries: timestamp !== undefined && TIME_SERIES_TIMESTAMP_TYPES.has(timestamp.type),
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
  const settled = await Promise.allSettled(
    unique.map((pattern) => executeEsql(client, buildProbeQuery(pattern), { signal }))
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
