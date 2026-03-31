/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WATCHLISTS_URL = `/api/entity_analytics/watchlists` as const;
export const WATCHLISTS_MANAGEMENT_URL = `${WATCHLISTS_URL}/management` as const;
export const WATCHLISTS_DATA_SOURCE_URL = `${WATCHLISTS_URL}/{watchlist_id}/entity_source` as const;
export const WATCHLISTS_DATA_SOURCE_LIST_URL = `${WATCHLISTS_DATA_SOURCE_URL}/list` as const;
export const WATCHLISTS_SYNC_URL = `${WATCHLISTS_URL}/{watchlist_id}/sync` as const;
export const WATCHLISTS_INDICES_URL = `${WATCHLISTS_URL}/indices` as const;

export const PRIVILEGED_USER_WATCHLIST_ID = 'privileged-user-monitoring-watchlist-id';

export const PREBUILT_WATCHLIST_NAMES: Record<string, string> = {
  [PRIVILEGED_USER_WATCHLIST_ID]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.watchlists.prebuiltPrivName',
    {
      defaultMessage: 'Privileged User',
    }
  ),
};

export const getWatchlistName = (watchlistId: string): string =>
  PREBUILT_WATCHLIST_NAMES[watchlistId] ?? watchlistId;
