/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetRecommendedDashboardsResponse } from '@kbn/observability-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../utils/kibana_react';

export interface RecommendedDashboardsByAlertParams {
  alertId: string;
}

export interface UseFetchRecommendedDashboardsByAlertResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetRecommendedDashboardsResponse['dashboards'];
}

export function useFetchRecommendedDashboardsByAlert({
  alertId,
}: RecommendedDashboardsByAlertParams): UseFetchRecommendedDashboardsByAlertResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchRecommendedDashboardsByAlert', alertId],
    queryFn: async ({ signal }) => {
      return await http.get<GetRecommendedDashboardsResponse>(
        '/api/observability/alerts/recommended_dashboards',
        {
          query: { alertId },
          version: '2023-10-31',
          signal,
        }
      );
    },
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (String(error) === 'Error: Forbidden') {
        return false;
      }

      return failureCount < 3;
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: 'Something went wrong while fetching recommended dashboards',
      });
    },
  });

  return {
    data: data?.dashboards || [],
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
