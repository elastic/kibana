/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ValueListItemsOverviewMetricsSchema, ListItemsOverviewAggsResponse } from '../types';
import { METRICS_ITEMS_DEFAULT_STATE } from '../utils';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

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
        median_items_per_list: {
          percentiles_bucket: {
            buckets_path: 'items_per_list._count',
            percents: [50],
          },
        },
      },
    };

    logger.debug(`Fetching value list items metrics: ${JSON.stringify(query, null, 2)}`);

    const response = await esClient.search(query);
    const { aggregations: aggs, hits } = response as unknown as ListItemsOverviewAggsResponse;

    logger.debug(`Returning value list items metrics response: ${JSON.stringify(aggs, null, 2)}`);

    return {
      total: hits.total.value || 0,
      max_items_per_list: aggs.max_items_per_list.value || 0,
      min_items_per_list: aggs.min_items_per_list.value || 0,
      median_items_per_list: aggs.median_items_per_list.values['50.0'] || 0,
    };
  } catch (error) {
    logger.error(`Error fetching value list items metrics: ${error.message}`);

    return { ...METRICS_ITEMS_DEFAULT_STATE, total: 0 };
  }
};
