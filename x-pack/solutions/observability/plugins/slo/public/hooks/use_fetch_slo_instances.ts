/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { FindSLOInstancesResponse } from '@kbn/slo-schema';
import { sloKeys } from './query_key_factory';
import { usePluginContext } from './use_plugin_context';

interface Params {
  sloId: string;
  search?: string;
  searchAfter?: string;
  size?: number;
  enabled?: boolean;
  remoteName?: string;
}

interface Response {
  data: FindSLOInstancesResponse | undefined;
  isLoading: boolean;
  isInitialLoading: boolean;
  isError: boolean;
}

export function useFetchSloInstances({
  sloId,
  search,
  searchAfter,
  size = 100,
  enabled = true,
  remoteName,
}: Params): Response {
  const { sloClient } = usePluginContext();

  const { isLoading, isInitialLoading, isError, data } = useQuery({
    queryKey: sloKeys.instances({ sloId, search, searchAfter, size, remoteName }),
    queryFn: async ({ signal }) => {
      return sloClient.fetch(`GET /internal/observability/slos/{id}/_instances`, {
        params: {
          path: { id: sloId },
          query: {
            search,
            size,
            searchAfter,
            remoteName,
          },
        },
        signal,
      });
    },
    enabled: Boolean(!!sloId && enabled),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isInitialLoading, isError, data };
}
