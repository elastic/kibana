/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_WATCHES_URL, buildWatchUrl } from '@kbn/pnd-common';
import type { GetWatchResponse, ListWatchesResponse } from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';

const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

export interface UpdateWatchSettingsBody {
  enabled?: boolean;
  description?: string;
  autonomyLevel?: number;
  scheduleInterval?: string;
}

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

/** POC: persist settings onto the user-owned workflow document. */
export const useUpdateWatchSettings = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      watchId,
      body,
    }: {
      watchId: string;
      body: UpdateWatchSettingsBody;
    }): Promise<GetWatchResponse> =>
      services.http!.patch<GetWatchResponse>(buildWatchUrl(watchId), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(body),
      }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
      queryClient.setQueryData(queryKeys.watches.detail(variables.watchId), data);
    },
  });
};

/** POC: take a shipped catalogue update, re-applying customer settings. */
export const useApplyWatchUpdate = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      watchId,
      force,
    }: {
      watchId: string;
      force?: boolean;
    }): Promise<{
      updated: boolean;
      conflict?: boolean;
      fromVersion?: number;
      toVersion?: number;
      watch?: GetWatchResponse['watch'];
    }> =>
      services.http!.post(`${PND_WATCHES_URL}/${encodeURIComponent(watchId)}/apply_update`, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ force: force ?? false }),
      }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
      if (data.watch) {
        queryClient.setQueryData(queryKeys.watches.detail(variables.watchId), {
          watch: data.watch,
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.watches.detail(variables.watchId),
        });
      }
    },
  });
};

/** POC stub — custom watch creation lands in a follow-up PR. */
export const useCreateWatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<GetWatchResponse> => {
      throw new Error('Custom watch creation is not available in this foundation PR');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
    },
  });
};

/** POC stub — custom watch deletion lands in a follow-up PR. */
export const useDeleteWatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_watchId: string): Promise<void> => {
      throw new Error('Custom watch deletion is not available in this foundation PR');
    },
    onSuccess: async (_data, watchId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
      await queryClient.removeQueries({ queryKey: queryKeys.watches.detail(watchId) });
    },
  });
};
