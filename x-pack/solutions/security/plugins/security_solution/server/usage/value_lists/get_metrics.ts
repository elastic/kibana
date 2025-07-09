/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ValueListMetricsSchema } from './types';
import { getListsOverview } from './queries/get_lists_overview';
import { getListItemsOverview } from './queries/get_list_items_overview';
import { METRICS_ITEMS_DEFAULT_STATE, METRICS_LISTS_DEFAULT_STATE } from './utils';

export interface GetValueListsMetricsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const getValueListsMetrics = async ({
  esClient,
  logger,
}: GetValueListsMetricsOptions): Promise<ValueListMetricsSchema> => {
  try {
    const listsOverview = await getListsOverview({
      esClient,
      logger,
    });
    const itemsOverview = await getListItemsOverview({
      esClient,
      logger,
    });

    return {
      lists_overview: listsOverview,
      items_overview: itemsOverview,
    };
  } catch (error) {
    logger.error(`Error fetching value lists metrics: ${error.message}`);

    return {
      lists_overview: METRICS_LISTS_DEFAULT_STATE,
      items_overview: METRICS_ITEMS_DEFAULT_STATE,
    };
  }
};
