/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';

export const useFetchPrivilegedUserIndices = (query: string | undefined) => {
  const { searchPrivMonIndices } = useEntityAnalyticsRoutes();
  return useQuery(
    ['POST', 'SEARCH_PRIVILEGED_USER_MONITORING_INDICES', query],
    ({ signal }) => searchPrivMonIndices({ signal, query }),
    {
      keepPreviousData: true,
      cacheTime: 0, // Do not cache the data because it is used by an autocomplete query
      refetchOnWindowFocus: false,
    }
  );
};
