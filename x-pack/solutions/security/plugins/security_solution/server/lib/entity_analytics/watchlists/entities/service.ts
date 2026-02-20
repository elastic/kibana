/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
// TODO: Replace MonitoredUserDoc with a watchlist-specific entity doc type
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { getIndexForWatchlist } from './utils';

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
  ): Promise<MonitoredUserDoc[]> => {
    const index = getIndexForWatchlist(watchlist.name, namespace);

    const response = await esClient.search<MonitoredUserDoc>({
      index,
      size: 10_000,
      query: { match_all: {} },
      _source: true,
    });

    return response.hits.hits
      .map((hit) => hit._source)
      .filter((source): source is MonitoredUserDoc => source !== undefined);
  };

  return { list };
};
