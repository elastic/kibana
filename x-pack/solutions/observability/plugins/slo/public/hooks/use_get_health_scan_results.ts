/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetHealthScanResultsResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseGetHealthScanResultsParams {
  scanId: string;
  size?: number;
  searchAfter?: string;
  problematic?: boolean;
  allSpaces?: boolean;
  refetchInterval?: number | false;
}

export interface UseGetHealthScanResults {
  data: GetHealthScanResultsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useGetHealthScanResults({
  scanId,
  size = 100,
  searchAfter,
  problematic,
  allSpaces,
  refetchInterval,
}: UseGetHealthScanResultsParams): UseGetHealthScanResults {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.healthScanResults({ scanId, size, searchAfter, problematic, allSpaces }),
    queryFn: async ({ signal }) => {
      return sloClient.fetch('GET /internal/observability/slos/_health/scans/{scanId}', {
        params: {
          path: { scanId },
          query: {
            size,
            ...(searchAfter !== undefined && { searchAfter }),
            ...(problematic !== undefined && { problematic }),
            ...(allSpaces !== undefined && { allSpaces }),
          },
        },
        signal,
      });
    },
    refetchInterval,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isError,
  };
}
