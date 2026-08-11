/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ListHealthScanResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

export interface UseListHealthScansParams {
  size?: number;
  refetchInterval?: number | false;
}

export interface UseListHealthScans {
  data: ListHealthScanResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useListHealthScans({
  size,
  refetchInterval,
}: UseListHealthScansParams = {}): UseListHealthScans {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.healthScans(size),
    queryFn: async ({ signal }) => {
      return sloClient.fetch('GET /internal/observability/slos/_health/scans', {
        params: { query: { size } },
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
