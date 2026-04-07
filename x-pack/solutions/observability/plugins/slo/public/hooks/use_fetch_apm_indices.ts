/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { useKibana } from './use_kibana';

type ApmIndex = string;

export interface UseFetchApmIndex {
  data: ApmIndex;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

function splitCommaSeparatedIndexPatterns(pattern: string | undefined): string[] {
  return pattern ? pattern.split(',') : [];
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

export function useFetchApmTracesIndex({
  enabled = true,
}: { enabled?: boolean } = {}): UseFetchApmIndex {
  const { apmSourcesAccess } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchApmTracesIndices'],
    queryFn: async ({ signal }) => {
      const { transaction, span } = await apmSourcesAccess.getApmIndices({ signal });
      const allIndices = [
        ...new Set([
          ...splitCommaSeparatedIndexPatterns(transaction),
          ...splitCommaSeparatedIndexPatterns(span),
        ]),
      ];
      return allIndices.join(',');
    },
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data: isInitialLoading ? '' : data ?? '',
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
