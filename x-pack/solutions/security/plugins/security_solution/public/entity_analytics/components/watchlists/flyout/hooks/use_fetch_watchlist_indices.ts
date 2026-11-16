/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../../api/api';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../../common/utils/execution_context';

const WATCHLIST_INDICES_SEARCH_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.WATCHLISTS,
  'watchlist_indices_search'
);

/**
 * Fetches index names (via cat indices, open and hidden) for watchlist index pattern selection.
 * Results are limited server-side; optional search string narrows the name wildcard.
 */
export const useFetchWatchlistIndices = (query: string | undefined) => {
  const { searchWatchlistIndices } = useEntityAnalyticsRoutes();

  return useQuery(
    ['GET', 'SEARCH_WATCHLIST_INDICES', query],
    ({ signal }) =>
      searchWatchlistIndices({ signal, query, context: WATCHLIST_INDICES_SEARCH_CONTEXT }),
    {
      keepPreviousData: true,
      cacheTime: 0,
      refetchOnWindowFocus: false,
    }
  );
};
