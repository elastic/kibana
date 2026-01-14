/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  DriftEventsResponse,
  DriftCategory,
  DriftSeverity,
} from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-drift-events';

interface UseDriftEventsOptions {
  timeRange?: string;
  categories?: DriftCategory[];
  severities?: DriftSeverity[];
  page?: number;
  pageSize?: number;
}

interface UseDriftEventsResult {
  data: DriftEventsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useDriftEvents = (
  options: UseDriftEventsOptions = {}
): UseDriftEventsResult => {
  const {
    timeRange = '24h',
    categories = [],
    severities = [],
    page = 1,
    pageSize = 10,
  } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchDriftEvents = useCallback(async (): Promise<DriftEventsResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<DriftEventsResponse>(ENDPOINT_ASSETS_ROUTES.DRIFT_SUMMARY, {
      query: {
        time_range: timeRange,
        categories: categories.length > 0 ? categories.join(',') : undefined,
        severities: severities.length > 0 ? severities.join(',') : undefined,
        page,
        page_size: pageSize,
      },
    });

    return response;
  }, [services, timeRange, categories, severities, page, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, timeRange, categories, severities, page, pageSize],
    queryFn: fetchDriftEvents,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY, timeRange, categories, severities, page, pageSize],
    });
  }, [queryClient, timeRange, categories, severities, page, pageSize]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
