/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ValueListsOverviewMetricsSchema, ListsOverviewAggsResponse } from '../types';
import { METRICS_LISTS_DEFAULT_STATE } from '../utils';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

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

    logger.debug(`Fetching value lists overview metrics: ${JSON.stringify(query, null, 2)}`);

    const response = await esClient.search(query);
    const { aggregations: aggs, hits } = response as unknown as ListsOverviewAggsResponse;

    type MetricKeys = keyof typeof METRICS_LISTS_DEFAULT_STATE;

    const listTypes = aggs.by_type.buckets.reduce((aggResult, typeBucket) => {
      const listType = typeBucket.key as MetricKeys;
      const count = typeBucket.doc_count;

      const updatedResult = {
        ...aggResult,
        [listType]: (aggResult[listType] ?? 0) + count,
      };
      return updatedResult;
    }, METRICS_LISTS_DEFAULT_STATE);

    logger.debug(
      `Returning value lists overview metrics response: ${JSON.stringify(listTypes, null, 2)}`
    );

    return {
      ...listTypes,
      total: hits.total.value,
    };
  } catch (error) {
    logger.error(`Error fetching value lists overview metrics: ${error.message}`);
    // Return default state if an error occurs
    return { ...METRICS_LISTS_DEFAULT_STATE, total: 0 };
  }
};
