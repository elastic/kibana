/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindInvestigationsResponse } from '@kbn/investigation-shared';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../utils/kibana_react';

export interface InvestigationsByAlertParams {
  alertId: string;
}

export interface UseFetchInvestigationsByAlertResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindInvestigationsResponse | undefined;
}

export function useFetchInvestigationsByAlert({
  alertId,
}: InvestigationsByAlertParams): UseFetchInvestigationsByAlertResponse {
  const {
    http,
    notifications: { toasts },
    investigate: investigatePlugin,
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchInvestigationsByAlert', alertId],
    queryFn: async ({ signal }) => {
      return await http.get<FindInvestigationsResponse>('/api/observability/investigations', {
        query: { alertId },
        version: '2023-10-31',
        signal,
      });
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
        title: 'Something went wrong while fetching Investigations',
      });
    },
    enabled: Boolean(investigatePlugin),
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
