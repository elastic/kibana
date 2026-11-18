/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../api';

/** Query key of the entities assigned to a watchlist by hand; invalidate it after assigning or removing one. */
export const MANUAL_WATCHLIST_ENTITIES_QUERY_KEY = 'watchlist-manual-entities';

/** One page of the entities assigned to the watchlist by hand. The previous page stays while the next loads. */
export const useManualWatchlistEntities = ({
  watchlistId,
  page,
  perPage,
}: {
  watchlistId: string;
  page: number;
  perPage: number;
}) => {
  const { listManualWatchlistEntities } = useEntityAnalyticsRoutes();

  return useQuery({
    queryKey: [MANUAL_WATCHLIST_ENTITIES_QUERY_KEY, watchlistId, page, perPage],
    queryFn: ({ signal }) => listManualWatchlistEntities({ watchlistId, page, perPage, signal }),
    keepPreviousData: true,
  });
};
