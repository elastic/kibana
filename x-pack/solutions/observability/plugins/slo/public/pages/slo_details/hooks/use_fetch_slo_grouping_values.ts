/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindSLOGroupingsResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useQuery } from '@kbn/react-query';
import { sloKeys } from '../../../hooks/query_key_factory';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface Params {
  sloId: string;
  groupingKey: string;
  instanceId: string;
  afterKey?: string;
  search?: string;
  remoteName?: string;
}

interface Response {
  data: FindSLOGroupingsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useFetchSloGroupingValues({
  sloId,
  groupingKey,
  instanceId,
  afterKey,
  search,
  remoteName,
}: Params): Response {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.groupings({ sloId, groupingKey, instanceId, afterKey, search, remoteName }),
    queryFn: async ({ signal }) => {
      return sloClient.fetch(`GET /internal/observability/slos/{id}/_groupings`, {
        params: {
          path: { id: sloId },
          query: {
            search,
            instanceId,
            groupingKey,
            afterKey,
            excludeStale: true,
            remoteName,
          },
        },
        signal,
      });
    },
    enabled: Boolean(!!sloId && !!groupingKey && instanceId !== ALL_VALUE),
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}
