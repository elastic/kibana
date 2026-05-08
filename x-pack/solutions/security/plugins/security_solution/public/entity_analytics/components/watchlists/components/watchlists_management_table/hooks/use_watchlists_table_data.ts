/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { WATCHLISTS_URL } from '../../../../../../../common/entity_analytics/watchlists/constants';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { useEntityAnalyticsRoutes } from '../../../../../api/api';
import type { WatchlistTableItemType } from '../types';

/**
 * Derives a human-readable source label from an entity source.
 *  - store  → "Entity Store"
 *  - index  → "Index"
 *  - entity_analytics_integration → the integration name (e.g. "AWS CloudTrail")
 */
const getSourceLabel = (source: MonitoringEntitySource): string => {
  if (source.type === 'store') {
    return 'Entity Store';
  }
  if (source.type === 'index') {
    return 'Index';
  }
  if (source.type === 'entity_analytics_integration') {
    return source.integrationName ?? 'Integration';
  }
  return source.name ?? '';
};

export const useWatchlistsTableData = (
  spaceId: string,
  pageIndex: number,
  toggleStatus: boolean
) => {
  const { fetchWatchlists, listWatchlistEntitySources } = useEntityAnalyticsRoutes();

  const {
    data: watchlists,
    isLoading: isWatchlistsLoading,
    isError,
    isRefetchError,
    refetch,
  } = useQuery({
    queryKey: ['watchlists-management-table', spaceId],
    enabled: toggleStatus,
    queryFn: ({ signal }) => fetchWatchlists({ signal }),
  });

  // Fetch entity sources for every watchlist that has entitySourceIds
  const { data: enrichedRecords, isLoading: isEnriching } = useQuery({
    queryKey: ['watchlists-management-table-sources', spaceId, watchlists],
    enabled: Boolean(watchlists?.length),
    queryFn: async ({ signal }) => {
      const list = Array.isArray(watchlists) ? watchlists : [];

      const results = await Promise.allSettled(
        list.map(async (watchlist): Promise<WatchlistTableItemType> => {
          if (!watchlist.id || !watchlist.entitySourceIds?.length) {
            return watchlist;
          }

          try {
            const { sources } = await listWatchlistEntitySources({
              watchlistId: watchlist.id,
              signal,
            });

            const labels = sources
              ?.map(getSourceLabel)
              .filter((label): label is string => Boolean(label));
            return {
              ...watchlist,
              source: labels?.length ? labels.join(', ') : undefined,
            };
          } catch {
            // If fetching sources fails for a single watchlist, just show it without the source
            return watchlist;
          }
        })
      );

      return results.map((r) =>
        r.status === 'fulfilled' ? r.value : ({} as WatchlistTableItemType)
      );
    },
  });

  const isLoading = isWatchlistsLoading || (Boolean(watchlists?.length) && isEnriching);
  const visibleRecords: WatchlistTableItemType[] =
    enrichedRecords ?? (Array.isArray(watchlists) ? watchlists : []);

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
