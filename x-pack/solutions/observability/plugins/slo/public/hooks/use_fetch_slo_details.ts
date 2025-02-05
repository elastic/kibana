/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, GetSLOResponse } from '@kbn/slo-schema';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { SLO_LONG_REFETCH_INTERVAL } from '../constants';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloDetailsResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetSLOResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetSLOResponse | undefined, unknown>>;
}

export function useFetchSloDetails({
  sloId,
  instanceId,
  remoteName,
  shouldRefetch,
}: {
  sloId?: string;
  instanceId?: string;
  remoteName?: string;
  shouldRefetch?: boolean;
}): UseFetchSloDetailsResponse {
  const { sloClient } = usePluginContext();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.detail(sloId!, instanceId, remoteName),
      queryFn: async ({ signal }) => {
        try {
          const response = await sloClient.fetch('GET /api/observability/slos/{id} 2023-10-31', {
            params: {
              path: { id: sloId! },
              query: {
                ...(instanceId !== ALL_VALUE && { instanceId }),
                ...(remoteName && { remoteName }),
              },
            },
            signal,
          });

          return response;
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      keepPreviousData: true,
      enabled: Boolean(sloId),
      refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
      refetchOnWindowFocus: false,
    }
  );

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
