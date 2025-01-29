/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, FetchHistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { SLO_LONG_REFETCH_INTERVAL } from '../constants';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseFetchHistoricalSummaryResponse {
  data: FetchHistoricalSummaryResponse | undefined;
  isInitialLoading: boolean;
  isRefetching: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface Params {
  sloList: SLOWithSummaryResponse[];
  shouldRefetch?: boolean;
  range?: {
    from: Date;
    to: Date;
  };
}

export function useFetchHistoricalSummary({
  sloList = [],
  shouldRefetch,
  range,
}: Params): UseFetchHistoricalSummaryResponse {
  const { sloClient } = usePluginContext();

  const list = sloList.map((slo) => ({
    sloId: slo.id,
    instanceId: slo.instanceId ?? ALL_VALUE,
    remoteName: slo.remote?.remoteName,
    timeWindow: slo.timeWindow,
    groupBy: slo.groupBy,
    revision: slo.revision,
    objective: slo.objective,
    budgetingMethod: slo.budgetingMethod,
    range: range
      ? {
          from: range?.from.toISOString(),
          to: range?.to.toISOString(),
        }
      : undefined,
  }));

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.historicalSummary(list),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('POST /internal/observability/slos/_historical_summary', {
          params: { body: { list } },
          signal,
        });
      } catch (error) {
        // ignore error
      }
    },
    enabled: Boolean(list.length > 0),
    refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isRefetching,
    isInitialLoading,
    isSuccess,
    isError,
  };
}
