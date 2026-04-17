/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

/**
 * Fetches indices that contain entity-related fields (user.name, host.name,
 * host.id, service.name, user.email, entity.id) for use in watchlist
 * index pattern selection.
 */
export const useFetchWatchlistIndices = (query: string | undefined) => {
  const { searchWatchlistIndices } = useEntityAnalyticsRoutes();

  return useQuery(
    ['GET', 'SEARCH_WATCHLIST_INDICES', query],
    ({ signal }) => searchWatchlistIndices({ signal, query }),
    {
      keepPreviousData: true,
      cacheTime: 0,
      refetchOnWindowFocus: false,
    }
  );
};
