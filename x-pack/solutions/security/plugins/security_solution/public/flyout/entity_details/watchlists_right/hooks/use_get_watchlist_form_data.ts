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
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

export type WatchlistFormValues = CreateWatchlistRequestBodyInput;

/**
 * Maps a stored entity source back to the shape expected by the create/update form.
 */
const toEntitySourceFormValues = (
  source: MonitoringEntitySource
): NonNullable<CreateWatchlistRequestBodyInput['entitySources']>[number] => ({
  type: source.type ?? 'index',
  name: source.name ?? '',
  indexPattern: source.indexPattern,
  identifierField: source.identifierField,
  filter: source.filter,
  queryRule: source.queryRule,
  enabled: source.enabled,
  integrationName: source.integrationName,
  matchers: source.matchers,
});

const toWatchlistFormValues = (
  watchlist: GetWatchlistResponse,
  entitySource?: MonitoringEntitySource
): WatchlistFormValues => ({
  name: watchlist.name ?? '',
  description: watchlist.description ?? '',
  riskModifier: watchlist.riskModifier,
  managed: watchlist.managed ?? false,
  entitySources: entitySource ? [toEntitySourceFormValues(entitySource)] : undefined,
});

export const useGetWatchlistFormData = (watchlistId?: string) => {
  const { getWatchlist, listWatchlistEntitySources } = useEntityAnalyticsRoutes();

  const watchlistQuery = useQuery<GetWatchlistResponse>({
    queryKey: ['watchlist-details', watchlistId],
    enabled: Boolean(watchlistId),
    queryFn: ({ signal }) => getWatchlist({ id: watchlistId as string, signal }),
  });

  const entitySourcesQuery = useQuery({
    queryKey: ['watchlist-entity-sources', watchlistId],
    enabled: Boolean(watchlistId),
    queryFn: ({ signal }) =>
      listWatchlistEntitySources({ watchlistId: watchlistId as string, signal }),
  });

  // Use the first entity source linked to the watchlist (if any)
  const firstSource = entitySourcesQuery.data?.sources?.[0];

  const initialWatchlist = useMemo(() => {
    if (!watchlistQuery.data) {
      return null;
    }
    return toWatchlistFormValues(watchlistQuery.data, firstSource);
  }, [watchlistQuery.data, firstSource]);

  return {
    initialWatchlist,
    entitySourceId: firstSource?.id,
    isLoading: watchlistQuery.isLoading || entitySourcesQuery.isLoading,
    isError: watchlistQuery.isError || entitySourcesQuery.isError,
  };
};
