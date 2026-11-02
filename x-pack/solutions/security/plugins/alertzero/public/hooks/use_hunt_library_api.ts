/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/alertzero-common';
import { HUNT_LIBRARY_URL } from '../../common/constants';
import type { HuntLibraryDetail, HuntLibraryListResponse } from '../../common/hunt_library';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './retry_on_transient_error';

/** Availability is cached server side for 60 seconds; re-reading sooner only repeats the answer. */
const STALE_TIME_MS = 60_000;

export const useHuntLibrary = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.huntLibrary.list(),
    queryFn: async (): Promise<HuntLibraryListResponse> =>
      services.http!.get<HuntLibraryListResponse>(HUNT_LIBRARY_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    staleTime: STALE_TIME_MS,
    retry: retryOnTransientError,
  });
};

export const useHuntLibraryDetail = (huntId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.huntLibrary.detail(huntId),
    queryFn: async (): Promise<HuntLibraryDetail> => {
      if (!huntId) {
        throw new Error('huntId is required');
      }
      return services.http!.get<HuntLibraryDetail>(
        `${HUNT_LIBRARY_URL}/${encodeURIComponent(huntId)}`,
        { version: API_VERSIONS.internal.v1 }
      );
    },
    enabled: Boolean(huntId),
    staleTime: STALE_TIME_MS,
    retry: retryOnTransientError,
  });
};
