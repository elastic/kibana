/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BASE_RAC_ALERTS_API_PATH, EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { type GetInvestigationResponse, alertOriginSchema } from '@kbn/investigation-shared';
import { useKibana } from './use_kibana';

export interface UseFetchAlertParams {
  investigation?: GetInvestigationResponse;
}

export interface UseFetchAlertResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: EcsFieldsResponse | undefined | null;
}

export function useFetchAlert({ investigation }: UseFetchAlertParams): UseFetchAlertResponse {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();
  const alertOriginInvestigation = alertOriginSchema.safeParse(investigation?.origin);
  const alertId = alertOriginInvestigation.success ? alertOriginInvestigation.data.id : undefined;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchAlert', investigation?.id],
    queryFn: async ({ signal }) => {
      return await http.get<EcsFieldsResponse>(BASE_RAC_ALERTS_API_PATH, {
        query: {
          id: alertId,
        },
        signal,
      });
    },
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: 'Something went wrong while fetching alert',
      });
    },
    enabled: Boolean(alertId),
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
