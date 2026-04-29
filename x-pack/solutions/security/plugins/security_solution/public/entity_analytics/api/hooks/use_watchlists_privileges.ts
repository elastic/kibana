/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useQuery } from '@kbn/react-query';
import type { PrivMonPrivilegesResponse } from '../../../../common/api/entity_analytics';
import { useEntityAnalyticsRoutes } from '../api';

// TODO: update to WATCHLISTS privileges route when backend is implemented; https://github.com/elastic/security-team/issues/16102
export const useWatchlistsPrivileges = () => {
  const { fetchWatchlistPrivileges } = useEntityAnalyticsRoutes();
  return useQuery<PrivMonPrivilegesResponse, SecurityAppError>({
    queryKey: ['GET', 'FETCH_WATCHLIST_PRIVILEGES'],
    queryFn: fetchWatchlistPrivileges,
    retry: 0,
  });
};
