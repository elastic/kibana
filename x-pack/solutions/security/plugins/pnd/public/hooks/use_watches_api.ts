/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_WATCHES_URL, buildWatchUrl } from '@kbn/pnd-common';
import type { GetWatchResponse, ListWatchesResponse } from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';

export const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    if (status === 501) {
      return false;
    }
    return !status || status >= 500;
  }
  return true;
};

export const useWatches = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.watches.list(),
    queryFn: async (): Promise<ListWatchesResponse> =>
      services.http!.get<ListWatchesResponse>(PND_WATCHES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
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
    retry: retryOnTransientError,
  });
};
