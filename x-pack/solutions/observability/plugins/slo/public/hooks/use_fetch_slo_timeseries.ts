/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetSLOTimeseriesResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloTimeseriesResponse {
  data: GetSLOTimeseriesResponse | undefined;
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseFetchSloTimeseriesParams {
  sloId: string;
  from: Date;
  to: Date;
  instanceId?: string;
  remoteName?: string;
  bucketInterval?: string;
  includeRaw?: boolean;
}

export function useFetchSloTimeseries({
  sloId,
  from,
  to,
  instanceId,
  remoteName,
  bucketInterval,
  includeRaw,
}: UseFetchSloTimeseriesParams): UseFetchSloTimeseriesResponse {
  const { sloClient } = usePluginContext();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.timeseries({
      sloId,
      from,
      to,
      instanceId,
      bucketInterval,
      includeRaw,
    }),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch(
          'GET /api/observability/slos/{id}/timeseries 2023-10-31',
          {
            params: {
              path: { id: sloId },
              query: {
                from: from.toISOString(),
                to: to.toISOString(),
                ...(instanceId && instanceId !== ALL_VALUE && { instanceId }),
                ...(remoteName && { remoteName }),
                ...(bucketInterval && { bucketInterval }),
                ...(includeRaw && { includeRaw: 'true' as const }),
              },
            },
            signal,
          }
        );
      } catch (error) {
        // ignore error
      }
    },
    enabled: Boolean(sloId && from && to),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
