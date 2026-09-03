/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@kbn/react-query';
import { useRef } from 'react';
import type { IToasts } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS, PND_WORKERS_URL, buildWorkerUrl } from '@kbn/pnd-common';
import type {
  ListWorkersResponse,
  UpdateWorkerRequestBody,
  UpdateWorkerResponse,
  Worker,
} from '@kbn/pnd-common';
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

const WORKER_SETTINGS_CONFLICT_MESSAGE = i18n.translate(
  'xpack.pnd.workerSettingsConflictErrorMessage',
  { defaultMessage: 'Worker settings changed; reload and try again' }
);

const WORKER_SETTINGS_FORBIDDEN_MESSAGE = i18n.translate(
  'xpack.pnd.workerSettingsForbiddenErrorMessage',
  { defaultMessage: 'You do not have permission to update this worker' }
);

const WORKER_UPDATE_ERROR_TITLE = i18n.translate('xpack.pnd.workerUpdateErrorMessage', {
  defaultMessage: 'Unable to update the worker',
});

export const notifyWorkerUpdateError = (toasts: IToasts, error: unknown): void => {
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  if (status === 409) {
    toasts.addWarning(WORKER_SETTINGS_CONFLICT_MESSAGE);
    return;
  }
  if (status === 403) {
    toasts.addDanger(WORKER_SETTINGS_FORBIDDEN_MESSAGE);
    return;
  }
  const cause = error instanceof Error ? error : new Error(String(error));
  toasts.addError(cause, { title: WORKER_UPDATE_ERROR_TITLE });
};

const touchesSettings = ({ autonomyLevel }: UpdateWorkerRequestBody): boolean =>
  autonomyLevel != null;

const applyWorkerPatch = (worker: Worker, patch: UpdateWorkerRequestBody): Worker => {
  const enabled = patch.enabled ?? worker.enabled;
  const autonomy = patch.autonomyLevel ?? worker.settings.autonomy;
  return {
    ...worker,
    enabled,
    state: worker.state === 'unavailable' ? 'unavailable' : enabled ? 'ok' : 'paused',
    settings: {
      ...worker.settings,
      autonomy,
    },
  };
};

const replaceWorkerInList = (
  queryClient: QueryClient,
  queryKey: ReturnType<typeof queryKeys.workers.list>,
  next: Worker
): void => {
  const current = queryClient.getQueryData<ListWorkersResponse>(queryKey);
  if (!current) {
    return;
  }
  queryClient.setQueryData<ListWorkersResponse>(queryKey, {
    workers: current.workers.map((worker) => (worker.id === next.id ? next : worker)),
  });
};

/**
 * Patches one Worker. Bound per mutation so callers pass only the fields that changed.
 * Optimistic so switches and sliders respond immediately.
 */
export const useUpdateWorker = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.workers.list();
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());

  return useMutation({
    mutationFn: ({
      workerId,
      patch,
    }: {
      workerId: string;
      patch: UpdateWorkerRequestBody;
    }): Promise<UpdateWorkerResponse> => {
      const execute = async (): Promise<UpdateWorkerResponse> => {
        const current = queryClient
          .getQueryData<ListWorkersResponse>(queryKey)
          ?.workers.find((worker) => worker.id === workerId);
        const body = touchesSettings(patch)
          ? { ...patch, settingsRevision: current?.settingsRevision ?? null }
          : patch;
        const response = await services.http!.patch<UpdateWorkerResponse>(
          buildWorkerUrl(workerId),
          {
            version: API_VERSIONS.internal.v1,
            body: JSON.stringify(body),
          }
        );
        // Reconcile inside the queued operation so the next request sees the new revision.
        replaceWorkerInList(queryClient, queryKey, response.worker);
        return response;
      };
      const operation = mutationQueue.current.then(execute, execute);
      mutationQueue.current = operation.then(
        () => undefined,
        () => undefined
      );
      return operation;
    },
    onMutate: async ({ workerId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ListWorkersResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<ListWorkersResponse>(queryKey, {
          workers: previous.workers.map((worker) =>
            worker.id === workerId ? applyWorkerPatch(worker, patch) : worker
          ),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      notifyWorkerUpdateError(services.notifications!.toasts, error);
    },
    onSuccess: (data) => {
      replaceWorkerInList(queryClient, queryKey, data.worker);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
};
