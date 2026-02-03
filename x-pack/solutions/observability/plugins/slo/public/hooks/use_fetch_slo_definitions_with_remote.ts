/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SearchSLODefinitionResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloDefinitionsWithRemoteResponse {
  data: SearchSLODefinitionResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => void;
}

interface SLODefinitionsParams {
  search?: string;
  size?: number;
  searchAfter?: string;
  remoteName?: string;
}

export function useFetchSloDefinitionsWithRemote({
  search = '',
  size = 100,
  searchAfter,
  remoteName,
}: SLODefinitionsParams): UseFetchSloDefinitionsWithRemoteResponse {
  const { sloClient } = usePluginContext();
  const searchTerm = search.endsWith('*') ? search : `${search}*`;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.searchDefinitions({ search: searchTerm, size, searchAfter, remoteName }),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('GET /internal/observability/slos/_search_definitions', {
          params: {
            query: {
              ...(searchTerm !== undefined && { search: searchTerm }),
              ...(size !== undefined && { size }),
              ...(searchAfter !== undefined && { searchAfter }),
              ...(remoteName !== undefined && { remoteName }),
            },
          },
          signal,
        });
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 1000, // 5 seconds
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
