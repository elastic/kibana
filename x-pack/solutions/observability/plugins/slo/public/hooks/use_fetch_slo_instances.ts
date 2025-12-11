/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { FindSLOInstancesResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloInstancesResponse {
  data: FindSLOInstancesResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
}

interface SLOInstancesParams {
  sloId: string;
  search?: string;
  size?: number;
  searchAfter?: string;
}

export function useFetchSloInstances({
  sloId,
  search,
  size = 100,
  searchAfter,
}: SLOInstancesParams): UseFetchSloInstancesResponse {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['slo', 'instances', sloId, search, size, searchAfter],
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('GET /internal/observability/slos/{id}/_instances', {
          params: {
            path: { id: sloId },
            query: {
              ...(search && { search }),
              ...(size && { size: String(size) }),
              ...(searchAfter && { searchAfter }),
            },
          },
          signal,
        });
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    enabled: Boolean(sloId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data, refetch };
}

