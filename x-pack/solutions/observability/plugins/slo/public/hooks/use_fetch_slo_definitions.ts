/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLODefinitionsResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloDefinitionsResponse {
  data: FindSLODefinitionsResponse | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
}

interface SLODefinitionParams {
  name?: string;
  includeOutdatedOnly?: boolean;
  tags?: string[];
  page?: number;
  perPage?: number;
}

export function useFetchSloDefinitions({
  name = '',
  includeOutdatedOnly = false,
  tags = [],
  page = 1,
  perPage = 100,
}: SLODefinitionParams): UseFetchSloDefinitionsResponse {
  const { sloClient } = usePluginContext();
  const search = name.endsWith('*') ? name : `${name}*`;
  const validTags = tags.filter((tag) => !!tag).join();

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.definitions({ search, page, perPage, includeOutdatedOnly, validTags }),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('GET /api/observability/slos/_definitions 2023-10-31', {
          params: {
            query: {
              ...(search !== undefined && { search }),
              ...(!!includeOutdatedOnly && { includeOutdatedOnly }),
              ...(validTags?.length && { tags: validTags }),
              ...(page !== undefined && { page: String(page) }),
              ...(perPage !== undefined && { perPage: String(perPage) }),
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
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
