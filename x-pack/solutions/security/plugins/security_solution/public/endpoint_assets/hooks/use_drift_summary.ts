/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DriftSummaryResponse } from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

const QUERY_KEY = 'endpoint-assets-drift-summary';

interface UseDriftSummaryOptions {
  timeRange?: string;
}

interface UseDriftSummaryResult {
  data: DriftSummaryResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useDriftSummary = (
  options: UseDriftSummaryOptions = {}
): UseDriftSummaryResult => {
  const { timeRange = '24h' } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchDriftSummary = useCallback(async (): Promise<DriftSummaryResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<DriftSummaryResponse>(
      ENDPOINT_ASSETS_ROUTES.DRIFT_SUMMARY,
      {
        query: {
          time_range: timeRange,
        },
      }
    );

    return response;
  }, [services, timeRange]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, timeRange],
    queryFn: fetchDriftSummary,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, timeRange] });
  }, [queryClient, timeRange]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
