/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SourceStatus } from '../../../../../../common/entity_analytics/executive_brief/types';

export const QUERY_TIMEOUT_MS = 10_000;

/** Maps a thrown error to the closest source status. */
export const statusFromError = (error: unknown): SourceStatus => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
  if (/timed? ?out|TimeoutError/i.test(message)) return 'timeout';
  if (/index_not_found|Unknown index|no such index/i.test(message)) return 'missing_index';
  return 'error';
};

/** Runs an ES|QL query as the user, bounded by the job's abort signal and a per-query timeout. */
export const runEsql = async (
  esClient: ElasticsearchClient,
  abortSignal: AbortSignal,
  query: string
): Promise<ESQLSearchResponse> => {
  const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(QUERY_TIMEOUT_MS)]);
  const response = await esClient.esql.query({ query, format: 'json' }, { signal });
  return { columns: response.columns, values: response.values } as ESQLSearchResponse;
};
