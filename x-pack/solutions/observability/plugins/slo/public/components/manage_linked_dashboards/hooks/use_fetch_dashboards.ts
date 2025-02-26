/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindDashboardsResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export interface UseFetchSloDefinitionsResponse {
  data: FindDashboardsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

interface Params {
  search?: string;
  page?: number;
}

export function useFetchDashboards({
  search = '',
  page = 1,
}: Params): UseFetchSloDefinitionsResponse {
  const { sloClient } = usePluginContext();
  const searchQuery = search && search.endsWith('*') ? search : `${search}*`;

  const { isLoading, isError, data } = useQuery({
    queryKey: ['fetchDashboards', { searchQuery, page }],
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /internal/observability/dashboards', {
        params: {
          query: { search: searchQuery, page: String(page) },
        },
        signal,
      });
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}
