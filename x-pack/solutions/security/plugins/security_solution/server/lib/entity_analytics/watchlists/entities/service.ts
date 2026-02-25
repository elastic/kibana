/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { getIndexForWatchlist } from './utils';
import type { WatchlistEntityDoc } from './types';

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
}

export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
}: WatchlistEntitiesServiceDeps) => {
  const list = async (
    watchlist: WatchlistObject,
    _rangeClauseKQL?: string
  ): Promise<WatchlistEntityDoc[]> => {
    const index = getIndexForWatchlist(watchlist.name, namespace);

    const response = await esClient.search<WatchlistEntityDoc>({
      index,
      size: 10_000,
      query: { match_all: {} },
      // _source: ['@timestamp', 'entity', 'labels'],
    });

    return response.hits.hits
      .map((hit) => hit._source)
      .filter(
        (source): source is WatchlistEntityDoc =>
          source != null && source.entity != null && typeof source.entity.id === 'string'
      );
  };

  return { list };
};
