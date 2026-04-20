/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

interface ApmIndices {
  metric: string;
  transaction: string;
  span: string;
}

export interface UseFetchApmIndex {
  data: ApmIndices;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const EMPTY_INDICES: ApmIndices = { metric: '', transaction: '', span: '' };

export function useFetchApmIndex({ enabled = true }: { enabled?: boolean } = {}): UseFetchApmIndex {
  const { apmSourcesAccess } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchApmIndices'],
    queryFn: async ({ signal }) => {
      const { metric, transaction, span } = await apmSourcesAccess.getApmIndices({ signal });
      return { metric, transaction, span };
    },
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data: isInitialLoading ? EMPTY_INDICES : data ?? EMPTY_INDICES,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
