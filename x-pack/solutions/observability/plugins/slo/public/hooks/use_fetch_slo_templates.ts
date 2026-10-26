/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { FindSLOTemplatesResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

interface UseFetchSloTemplatesParams {
  search?: string;
  tags?: string[];
  page?: number;
  perPage?: number;
}

export interface UseFetchSloTemplatesResponse {
  isLoading: boolean;
  isError: boolean;
  data: FindSLOTemplatesResponse | undefined;
}

export function useFetchSloTemplates({
  search,
  tags,
  page = 1,
  perPage = 20,
}: UseFetchSloTemplatesParams = {}): UseFetchSloTemplatesResponse {
  const { sloClient } = usePluginContext();
  const searchWithWildcard = search && !search.endsWith('*') ? `${search}*` : search;

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.templatesList({ search, tags, page, perPage }),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch('GET /api/observability/slo_templates', {
        params: {
          query: {
            ...(searchWithWildcard && { search: searchWithWildcard }),
            ...(tags?.length && { tags: tags.join(',') }),
            page,
            perPage,
          },
        },
        signal,
      });
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    data,
    isLoading,
    isError,
  };
}
