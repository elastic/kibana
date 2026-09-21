/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, ALERTZERO_WATCHES_URL, buildWatchUrl } from '@kbn/alertzero-common';
import type { GetWatchResponse, ListWatchesResponse } from '@kbn/alertzero-common';
import { retryOnTransientError } from '@kbn/agentic-investigations-plugin/public';
import { queryKeys } from '../query_keys';

/**
 * Bounds the shared transient-error retry to a single retry. The onboarding gate
 * blocks routing on these queries, so a persistently-failing backend must surface
 * the empty state in about a second instead of holding a spinner through the full
 * three-attempt backoff (~11s).
 */
export const retryOnceOnTransientError = (failureCount: number, error: unknown): boolean =>
  failureCount < 1 && retryOnTransientError(failureCount, error);

export const useWatches = (options?: { enabled?: boolean }) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.watches.list(),
    queryFn: async (): Promise<ListWatchesResponse> =>
      services.http!.get<ListWatchesResponse>(ALERTZERO_WATCHES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    enabled: options?.enabled,
    keepPreviousData: true,
    retry: retryOnceOnTransientError,
  });
};

export const useWatch = (watchId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.watches.detail(watchId),
    queryFn: async (): Promise<GetWatchResponse> => {
      if (!watchId) {
        throw new Error('watchId is required');
      }

      return services.http!.get<GetWatchResponse>(buildWatchUrl(watchId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: Boolean(watchId),
    retry: retryOnceOnTransientError,
  });
};
