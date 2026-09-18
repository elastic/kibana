/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_WORKERS_URL, buildWorkerUrl } from '@kbn/pnd-common';
import type { ListWorkersResponse, WatchWorker } from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './use_watches_api';

export const useWorkers = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.workers.list(),
    queryFn: async (): Promise<ListWorkersResponse> =>
      services.http!.get<ListWorkersResponse>(PND_WORKERS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export interface ToggleWorkerVariables {
  workerId: string;
  enabled: boolean;
}

/**
 * Toggles a worker's global flag. Optimistic so the switch responds immediately.
 *
 * Also invalidates every watch detail, because a watch's Workers table greys out rows whose global
 * flag is off — effective enablement is global AND the per-watch attachment.
 */
export const useToggleWorker = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workerId,
      enabled,
    }: ToggleWorkerVariables): Promise<{
      worker: WatchWorker;
    }> =>
      services.http!.patch<{ worker: WatchWorker }>(buildWorkerUrl(workerId), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ workerId, enabled }) => {
      const queryKey = queryKeys.workers.list();
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ListWorkersResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<ListWorkersResponse>(queryKey, {
          workers: previous.workers.map((worker) =>
            worker.id === workerId ? { ...worker, enabled } : worker
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.workers.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workers.list() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.all });
    },
  });
};
