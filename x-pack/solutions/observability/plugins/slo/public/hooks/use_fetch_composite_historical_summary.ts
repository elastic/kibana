/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FetchCompositeHistoricalSummaryResponse,
  HistoricalSummaryResponse,
} from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export function useFetchCompositeHistoricalSummary(compositeIds: string[]) {
  const { sloClient } = usePluginContext();

  const {
    isInitialLoading: isLoading,
    isError,
    data,
  } = useQuery({
    queryKey: sloKeys.compositeHistoricalSummary(compositeIds),
    queryFn: async ({ signal }) => {
      return await sloClient.fetch(
        'POST /internal/observability/slo_composites/_historical_summary',
        {
          params: { body: { list: compositeIds } },
          signal,
        }
      );
    },
    enabled: compositeIds.length > 0,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const historicalSummaryById = useMemo(() => {
    const map = new Map<string, HistoricalSummaryResponse[]>();
    if (data) {
      for (const entry of data as FetchCompositeHistoricalSummaryResponse) {
        map.set(entry.compositeId, entry.data);
      }
    }
    return map;
  }, [data]);

  return { historicalSummaryById, isLoading, isError };
}
