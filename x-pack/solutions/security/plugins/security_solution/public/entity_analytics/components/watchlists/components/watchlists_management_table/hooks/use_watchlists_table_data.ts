/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { WATCHLISTS_URL } from '../../../../../../../common/entity_analytics/watchlists/constants';
import { useEntityAnalyticsRoutes } from '../../../../../api/api';
import type { WatchlistTableItemType } from '../types';

export const useWatchlistsTableData = (
  spaceId: string,
  pageIndex: number,
  toggleStatus: boolean
) => {
  const { fetchWatchlists } = useEntityAnalyticsRoutes();

  const {
    data: watchlists,
    isLoading,
    isError,
    isRefetchError,
    refetch,
  } = useQuery({
    queryKey: ['watchlists-management-table', spaceId],
    enabled: toggleStatus,
    queryFn: ({ signal }) => fetchWatchlists({ signal }),
  });

  const visibleRecords: WatchlistTableItemType[] = Array.isArray(watchlists) ? watchlists : [];

  const inspect = {
    dsl: [
      JSON.stringify(
        {
          method: 'GET',
          path: `${WATCHLISTS_URL}/list`,
        },
        null,
        2
      ),
    ],
    response: watchlists ? [JSON.stringify(watchlists, null, 2)] : [],
  };

  return {
    visibleRecords,
    isLoading,
    hasError: isError || isRefetchError,
    refetch,
    inspect,
    hasNextPage: false,
  };
};
