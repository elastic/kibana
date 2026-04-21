/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

export interface ApmIndicesData {
  metric: string;
  transaction: string;
  span: string;
}

export interface UseFetchApmIndices {
  data: ApmIndicesData;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const INITIAL_DATA: ApmIndicesData = { metric: '', transaction: '', span: '' };

export function useFetchApmIndices({
  enabled = true,
}: { enabled?: boolean } = {}): UseFetchApmIndices {
  const { apmSourcesAccess } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchApmIndices'],
    queryFn: async ({ signal }) => {
      try {
        const response = await apmSourcesAccess.getApmIndices({ signal });
        return {
          metric: response.metric ?? '',
          transaction: response.transaction ?? '',
          span: response.span ?? '',
        };
      } catch (error) {
        // ignore error
        return INITIAL_DATA;
      }
    },
    refetchOnWindowFocus: false,
    enabled,
  });
  return {
    data: isInitialLoading ? INITIAL_DATA : data ?? INITIAL_DATA,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
