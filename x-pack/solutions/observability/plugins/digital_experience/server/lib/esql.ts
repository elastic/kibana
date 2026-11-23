/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ComposerQuery } from '@elastic/esql';
import { isResponseError } from '@kbn/es-errors';
import type { EsqlOutput, TracedElasticsearchClient } from '@kbn/traced-es-client';
import { ENVIRONMENT_FIELDS } from '../../common/otel_data';
import { environmentFilter } from './helpers/environment';

const UNKNOWN_INDEX = /Unknown index/;

/** Whether ES|QL rejected the query because an index it names doesn't exist. */
const isUnknownIndexError = (error: unknown): boolean => {
  if (!isResponseError(error)) {
    return false;
  }
  const { type, reason } = error.body?.error ?? {};
  return type === 'verification_exception' && UNKNOWN_INDEX.test(reason ?? '');
};

/**
 * The rows of an ES|QL query, traced as `operationName`; none when its indices don't exist.
 * A wildcard that matches nothing already answers with no rows; a concrete index name that doesn't
 * exist fails with "Unknown index" instead, which counts as no rows too.
 * A failed shard fails the query, as partial counts would pass for complete ones.
 */
export const runEsql = async <TRow extends object>(
  esClient: TracedElasticsearchClient,
  operationName: string,
  query: ComposerQuery,
  filter: estypes.QueryDslQueryContainer
): Promise<TRow[]> => {
  const { query: esqlQuery, params } = query.toRequest();
  try {
    const { hits } = await esClient.esql<TRow & EsqlOutput, { transform: 'plain' }>(
      operationName,
      {
        query: esqlQuery,
        params: params as estypes.EsqlQueryRequest['params'],
        filter,
        allow_partial_results: false,
      },
      { transform: 'plain' }
    );
    return hits;
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
      environmentFilter(ENVIRONMENT_FIELDS, environment),
    ],
  },
});
