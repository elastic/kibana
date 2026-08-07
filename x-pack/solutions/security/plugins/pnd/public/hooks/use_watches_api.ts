/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  PND_WATCHES_SETUP_URL,
  PND_WATCHES_URL,
  buildWatchUrl,
} from '@kbn/pnd-common';
import type {
  GetWatchResponse,
  ListWatchesResponse,
  SetupWatchesResponse,
  WatchSettings,
} from '@kbn/pnd-common';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { queryKeys } from '../query_keys';

let setupWatchesPromise: Promise<SetupWatchesResponse> | undefined;

const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

export const useWatches = () => {
  const { services } = useKibana();
  const capabilities = services.application?.capabilities;
  const canSetUpWatches =
    capabilities?.pnd?.write === true &&
    capabilities?.workflowsManagement?.[WorkflowsManagementUiActions.create] === true &&
    capabilities?.workflowsManagement?.[WorkflowsManagementUiActions.update] === true;

  return useQuery({
    queryKey: queryKeys.watches.list(),
    queryFn: async (): Promise<ListWatchesResponse & { setupFailed: string[] }> => {
      if (canSetUpWatches && !setupWatchesPromise) {
        setupWatchesPromise = services
          .http!.post<SetupWatchesResponse>(PND_WATCHES_SETUP_URL, {
            version: API_VERSIONS.internal.v1,
          })
          .catch((error) => {
            setupWatchesPromise = undefined;
            throw error;
          });
      }
      const setup = setupWatchesPromise ? await setupWatchesPromise : { failed: [] };
      const watches = await services.http!.get<ListWatchesResponse>(PND_WATCHES_URL, {
        version: API_VERSIONS.internal.v1,
      });
      return { ...watches, setupFailed: setup.failed };
    },
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

export const useUpdateWatchSettings = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      watchId,
      body,
    }: {
      watchId: string;
      body: WatchSettings;
    }): Promise<GetWatchResponse> =>
      services.http!.put<GetWatchResponse>(buildWatchUrl(watchId), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(body),
      }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
      queryClient.setQueryData(queryKeys.watches.detail(variables.watchId), data);
    },
  });
};
