/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { getIndexForWatchlist } from './utils';

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
}

export interface AddWatchlistEntitiesResult {
  added: number;
  failed: number;
}

export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
}: WatchlistEntitiesServiceDeps) => {
  const add = async (
    watchlist: WatchlistObject,
    entities: Array<Record<string, unknown>>
  ): Promise<AddWatchlistEntitiesResult> => {
    if (entities.length === 0) {
      return {
        added: 0,
        failed: 0,
      };
    }

    const index = getIndexForWatchlist(watchlist.name, namespace);
    const operations = entities.flatMap((entity) => [{ index: {} }, entity]);

    const bulkResponse = await esClient.bulk({
      index,
      operations,
      refresh: 'wait_for',
    });

    const failed = (bulkResponse.items ?? []).reduce((count, item) => {
      if ('index' in item && item.index.error !== undefined) {
        return count + 1;
      }

      return count;
    }, 0);

    return {
      added: entities.length - failed,
      failed,
    };
  };

  return { add };
};
