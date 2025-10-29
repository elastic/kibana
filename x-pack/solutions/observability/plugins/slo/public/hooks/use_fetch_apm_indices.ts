/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { useKibana } from './use_kibana';

type ApmIndex = string;

export interface UseFetchApmIndex {
  data: ApmIndex;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function useFetchApmIndex(): UseFetchApmIndex {
  const { apmSourcesAccess } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchApmIndices'],
    queryFn: async ({ signal }) => {
      try {
        const response = await apmSourcesAccess.getApmIndices({ signal });

        return response.metric ?? '';
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
  });

  return {
    data: isInitialLoading ? '' : data ?? '',
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
