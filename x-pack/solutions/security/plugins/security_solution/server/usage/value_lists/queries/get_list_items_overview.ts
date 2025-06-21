/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ValueListItemsOverviewMetricsSchema, ListItemsOverviewAggsResponse } from '../types';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

const METRICS_DEFAULT_STATE = {
  total: 0,
  max_items_per_list: 0,
  min_items_per_list: 0,
  average_items_per_list: 0,
};

export const getListItemsOverview = async ({
  logger,
  esClient,
}: GetExceptionsOverviewOptions): Promise<ValueListItemsOverviewMetricsSchema> => {
  try {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.items*',
      ignore_unavailable: false,
      size: 0,
      aggs: {
        items_per_list: {
          terms: {
            field: 'list_id',
            size: 10000,
          },
        },
        min_items_per_list: {
          min_bucket: {
            buckets_path: 'items_per_list._count',
          },
        },
        max_items_per_list: {
          max_bucket: {
            buckets_path: 'items_per_list._count',
          },
        },
        avg_items_per_list: {
          avg_bucket: {
            buckets_path: 'items_per_list._count',
          },
        },
      },
    };

    const response = await esClient.search(query);
    const { aggregations: aggs, hits } = response as unknown as ListItemsOverviewAggsResponse;

    return {
      total: hits.total.value,
      max_items_per_list: aggs.max_items_per_list.value,
      min_items_per_list: aggs.min_items_per_list.value,
      average_items_per_list: aggs.avg_items_per_list.value,
    };
  } catch (error) {
    return { ...METRICS_DEFAULT_STATE, total: 0 };
  }
};
