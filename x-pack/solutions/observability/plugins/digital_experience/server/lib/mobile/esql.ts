/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ComposerQuery } from '@elastic/esql';
import type { EsqlOutput, TracedElasticsearchClient } from '@kbn/traced-es-client';
import { ENVIRONMENT_FIELDS } from '../../../common/otel_data';
import { environmentFilter } from '../helpers/environment';

const UNKNOWN_INDEX = /Unknown index/;

/** Whether ES|QL rejected the query because none of its indices exists, e.g. without OTel data. */
export const isUnknownIndexError = (error: unknown): boolean => {
  const { type, reason } =
    (error as { meta?: { body?: { error?: { type?: string; reason?: string } } } })?.meta?.body
      ?.error ?? {};
  return type === 'verification_exception' && UNKNOWN_INDEX.test(reason ?? '');
};

/**
 * The rows of a mobile ES|QL query, traced as `operationName`; none when its indices don't exist.
 * A failed shard fails the query, as partial counts would pass for complete ones.
 */
export const runMobileEsql = async <TRow extends EsqlOutput>(
  esClient: TracedElasticsearchClient,
  operationName: string,
  query: ComposerQuery,
  filter: estypes.QueryDslQueryContainer
): Promise<TRow[]> => {
  const { query: esqlQuery, params } = query.toRequest();
  try {
    const { hits } = await esClient.esql<TRow, { transform: 'plain' }>(
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
      environmentFilter([...ENVIRONMENT_FIELDS], environment),
    ],
  },
});
