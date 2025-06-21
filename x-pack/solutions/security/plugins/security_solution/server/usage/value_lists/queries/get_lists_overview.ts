/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ValueListsOverviewMetricsSchema, ListsOverviewAggsResponse } from '../types';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

const METRICS_DEFAULT_STATE = {
  binary: 0,
  boolean: 0,
  byte: 0,
  date: 0,
  date_nanos: 0,
  date_range: 0,
  double: 0,
  double_range: 0,
  float: 0,
  float_range: 0,
  geo_point: 0,
  geo_shape: 0,
  half_float: 0,
  integer: 0,
  integer_range: 0,
  ip: 0,
  ip_range: 0,
  keyword: 0,
  long: 0,
  long_range: 0,
  shape: 0,
  short: 0,
  text: 0,
};

export const getListsOverview = async ({
  logger,
  esClient,
}: GetExceptionsOverviewOptions): Promise<ValueListsOverviewMetricsSchema> => {
  try {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.lists*',
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      aggs: {
        by_type: {
          terms: {
            field: 'type',
          },
        },
      },
    };

    const response = await esClient.search(query);
    const { aggregations: aggs, hits } = response as unknown as ListsOverviewAggsResponse;

    type MetricKeys = keyof typeof METRICS_DEFAULT_STATE;

    const listTypes = aggs.by_type.buckets.reduce((aggResult, typeBucket) => {
      const listType = typeBucket.key as MetricKeys;
      const count = typeBucket.doc_count;

      const updatedResult = {
        ...aggResult,
        [listType]: (aggResult[listType] ?? 0) + count,
      };
      return updatedResult;
    }, METRICS_DEFAULT_STATE);

    return {
      ...listTypes,
      total: hits.total.value,
    };
  } catch (error) {
    return { ...METRICS_DEFAULT_STATE, total: 0 };
  }
};
