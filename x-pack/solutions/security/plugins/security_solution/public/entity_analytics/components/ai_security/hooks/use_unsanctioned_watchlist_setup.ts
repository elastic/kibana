/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useGetWatchlists } from '../../../api/hooks/use_get_watchlists';

const UNSANCTIONED_SOURCES_QUERY_KEY = 'ai-security-unsanctioned-watchlist-sources';

/**
 * Whether the Unsanctioned AI agents watchlist exists in the space but says nothing yet: no entity
 * source and no members. A watchlist that isn't installed, or a read that fails, needs no setup.
 */
export const useUnsanctionedWatchlistNeedsSetup = ({
  watchlistId,
  hasMemberRows,
}: {
  watchlistId: string;
  /** An inventory row already carries the watchlist. */
  hasMemberRows: boolean;
}): boolean => {
  const { listWatchlistEntitySources } = useEntityAnalyticsRoutes();
  const { data: watchlists } = useGetWatchlists();
  const watchlist = watchlists?.find(({ id }) => id === watchlistId);
  const { data: sources, isSuccess } = useQuery({
    queryKey: [UNSANCTIONED_SOURCES_QUERY_KEY, watchlistId],
    enabled: watchlist != null,
    queryFn: ({ signal }) => listWatchlistEntitySources({ watchlistId, signal }),
  });
  return (
    watchlist != null &&
    isSuccess &&
    (sources?.sources ?? []).length === 0 &&
    !watchlist.entityCount &&
    !watchlist.hasManualEntities &&
    !hasMemberRows
  );
};
