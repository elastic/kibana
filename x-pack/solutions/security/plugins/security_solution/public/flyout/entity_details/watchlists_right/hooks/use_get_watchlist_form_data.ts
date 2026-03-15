/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import type { GetWatchlistResponse } from '../../../../../common/api/entity_analytics/watchlists/management/get.gen';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

export type WatchlistFormValues = CreateWatchlistRequestBodyInput;

const toWatchlistFormValues = (watchlist: GetWatchlistResponse): WatchlistFormValues => ({
  name: watchlist.name ?? '',
  description: watchlist.description ?? '',
  riskModifier: watchlist.riskModifier,
  managed: watchlist.managed ?? false,
});

export const useGetWatchlistFormData = (watchlistId?: string) => {
  const { getWatchlist } = useEntityAnalyticsRoutes();

  const query = useQuery<GetWatchlistResponse>({
    queryKey: ['watchlist-details', watchlistId],
    enabled: Boolean(watchlistId),
    queryFn: ({ signal }) => getWatchlist({ id: watchlistId as string, signal }),
  });

  const initialWatchlist = useMemo(
    () => (query.data ? toWatchlistFormValues(query.data) : null),
    [query.data]
  );

  return {
    initialWatchlist,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
