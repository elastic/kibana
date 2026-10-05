/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@kbn/react-query';
import type { IToasts } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS, ALERTZERO_WORKERS_URL, buildWorkerUrl } from '@kbn/alertzero-common';
import type {
  ListWorkersResponse,
  UpdateWorkerRequestBody,
  UpdateWorkerResponse,
  Worker,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from './retry_on_transient_error';
import { queryKeys } from '../query_keys';

export const useWorkers = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.workers.list(),
    queryFn: async (): Promise<ListWorkersResponse> =>
      services.http!.get<ListWorkersResponse>(ALERTZERO_WORKERS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

const WORKER_SETTINGS_CONFLICT_MESSAGE = i18n.translate(
  'xpack.alertzero.workerSettingsConflictErrorMessage',
  { defaultMessage: 'Worker settings changed; reload and try again' }
);

const WORKER_SETTINGS_FORBIDDEN_MESSAGE = i18n.translate(
  'xpack.alertzero.workerSettingsForbiddenErrorMessage',
  { defaultMessage: 'You do not have permission to update this worker' }
);

const WORKER_UPDATE_ERROR_TITLE = i18n.translate('xpack.alertzero.workerUpdateErrorMessage', {
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

export const notifyWorkerRulesSkipped = (toasts: IToasts, skippedRuleCount: number): void => {
  toasts.addWarning({
    title: i18n.translate('xpack.alertzero.workerRulesSkippedTitle', {
      defaultMessage: 'Some rules were not attached to the worker',
    }),
    text: i18n.translate('xpack.alertzero.workerRulesSkippedText', {
      defaultMessage:
        '{count, plural, one {# machine learning rule was} other {# machine learning rules were}} skipped because you do not have the machine learning permissions needed to edit {count, plural, one {it} other {them}}. {count, plural, one {It} other {They}} will not be triaged by the worker.',
      values: { count: skippedRuleCount },
    }),
  });
};

export const notifyWorkerRulesLeftAttached = (toasts: IToasts, skippedRuleCount: number): void => {
  toasts.addWarning({
    title: i18n.translate('xpack.alertzero.workerRulesLeftAttachedTitle', {
      defaultMessage: 'Some rules still have the worker attached',
    }),
    text: i18n.translate('xpack.alertzero.workerRulesLeftAttachedText', {
      defaultMessage:
        '{count, plural, one {# machine learning rule still has} other {# machine learning rules still have}} the worker attached because you do not have the machine learning permissions needed to edit {count, plural, one {it} other {them}}. Someone with machine learning permissions must disable the worker to detach {count, plural, one {it} other {them}}.',
      values: { count: skippedRuleCount },
    }),
  });
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
    ...current,
    workers: current.workers.map((worker) => (worker.id === next.id ? next : worker)),
  });
};

/**
 * Patches one Worker. Callers pass only the fields that changed; a `settings` patch must carry
 * the `settingsRevision` its draft was built from, so a stale draft is refused rather than
 * silently re-based onto whatever revision is in the cache.
 */
export const useUpdateWorker = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.workers.list();

  return useMutation({
    mutationFn: ({
      workerId,
      patch,
    }: {
      workerId: string;
      patch: UpdateWorkerRequestBody;
    }): Promise<UpdateWorkerResponse> =>
      services.http!.patch<UpdateWorkerResponse>(buildWorkerUrl(workerId), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(patch),
      }),
    // Only the confirmed Worker touches the cache; nothing is written before the server answers.
    onSuccess: (data, { patch }) => {
      replaceWorkerInList(queryClient, queryKey, data.worker);
      if (!data.skippedRuleCount) {
        return;
      }
      if (patch.enabled === false) {
        notifyWorkerRulesLeftAttached(services.notifications!.toasts, data.skippedRuleCount);
      } else {
        notifyWorkerRulesSkipped(services.notifications!.toasts, data.skippedRuleCount);
      }
    },
    onError: (error) => {
      notifyWorkerUpdateError(services.notifications!.toasts, error);
    },
    // Awaited so mutateAsync resolves after the reload attempt. A failed reload surfaces as the
    // workers query error, which the Watch page uses to block Save.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
};
