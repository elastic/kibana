/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/observability-plugin/public/utils/kibana_react';

export type Index = string;

export interface UseFetchIndicesResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Index[] | undefined;
}

interface Params {
  search?: string;
}

interface ResolveIndexReponse {
  indices: Array<{ name: string }>;
}

export function useFetchIndices({ search }: Params): UseFetchIndicesResponse {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchIndices', search],
    queryFn: async () => {
      const searchPattern = search?.endsWith('*') ? search : `${search}*`;
      const response = await http.get<ResolveIndexReponse>(
        `/internal/index-pattern-management/resolve_index/${searchPattern}`
      );
      return response.indices.map((index) => index.name);
    },
    retry: false,
    enabled: Boolean(search),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return { isLoading, isError, isSuccess, data };
}
