/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindSLODefinitionsResponse } from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchSloDefinitionsResponse {
  data: FindSLODefinitionsResponse | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
}

export type SLODefinitionSortableFields = 'version' | 'enabled';

interface SLODefinitionParams {
  name?: string;
  includeOutdatedOnly?: boolean;
  tags?: string[];
  page?: number;
  perPage?: number;
  includeHealth?: boolean;
  enabledFilter?: string;
  sortField?: SLODefinitionSortableFields;
  sortOrder?: 'asc' | 'desc';
}

export function useFetchSloDefinitions({
  name = '',
  includeOutdatedOnly = false,
  tags = [],
  page = 1,
  perPage = 100,
  includeHealth = false,
  enabledFilter = undefined,
  sortField = undefined,
  sortOrder = undefined,
}: SLODefinitionParams): UseFetchSloDefinitionsResponse {
  const { sloClient } = usePluginContext();
  const search = name.endsWith('*') ? name : `${name}*`;
  const validTags = tags.filter((tag) => !!tag).join();

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.definitions({
      search,
      page,
      perPage,
      includeOutdatedOnly,
      validTags,
      enabledFilter,
      sortField,
      sortOrder,
    }),
    queryFn: async ({ signal }) => {
      try {
        const query = {
          ...(search !== undefined && { search }),
          ...(!!includeOutdatedOnly && { includeOutdatedOnly }),
          ...(!!includeHealth && { includeHealth }),
          ...(validTags?.length && { tags: validTags }),
          ...(page !== undefined && { page: String(page) }),
          ...(perPage !== undefined && { perPage: String(perPage) }),
          ...((enabledFilter === 'true' || enabledFilter === 'false') && { enabledFilter }),
          ...(!!sortField && !!sortOrder && { sortField, sortOrder }),
        };
        return await sloClient.fetch('GET /api/observability/slos/_definitions 2023-10-31', {
          params: {
            query,
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
