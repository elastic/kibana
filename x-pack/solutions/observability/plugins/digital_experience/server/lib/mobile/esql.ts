/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlQuery } from '../../../common/mobile_panel';
import { ENVIRONMENT_FIELDS } from '../../../common/otel_data';
import { toEsqlRows } from '../../services/sessions/summary_documents';
import type { EsqlRow } from '../../services/sessions/summary_documents';
import { environmentFilter } from '../helpers/environment';

const UNKNOWN_INDEX = /Unknown index/;

/** Whether ES|QL rejected the query because none of its indices exists, e.g. without OTel data. */
export const isUnknownIndexError = (error: unknown): boolean => {
  const { type, reason } =
    (error as { meta?: { body?: { error?: { type?: string; reason?: string } } } })?.meta?.body
      ?.error ?? {};
  return type === 'verification_exception' && UNKNOWN_INDEX.test(reason ?? '');
};

/** The rows of an ES|QL query, none when its indices don't exist. */
export const runEsql = async (
  esClient: ElasticsearchClient,
  { query, params }: EsqlQuery,
  filter: estypes.QueryDslQueryContainer,
  signal?: AbortSignal
): Promise<EsqlRow[]> => {
  try {
    return toEsqlRows(
      // A failed shard fails the query: partial counts would pass for complete ones.
      await esClient.esql.query({ query, params, filter, allow_partial_results: false }, { signal })
    );
  } catch (error) {
    if (isUnknownIndexError(error)) {
      return [];
    }
    throw error;
  }
};

/**
 * The documents of `[start, end)`, in `environment` when set, as an ES|QL `filter`. Half-open, so
 * a period and the one before it don't share the document at their boundary.
 */
export const timeFilter = (
  start: number,
  end: number,
  environment: string | undefined
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: start, lt: end, format: 'epoch_millis' } } },
      environmentFilter([...ENVIRONMENT_FIELDS], environment),
    ],
  },
});
