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
import { workerName } from '../../common/worker_names';
import { retryOnTransientError } from './retry_on_transient_error';
import { invalidateHuntThreatIntelSupplyStatus } from './hunt/use_hunt_threat_intel_supply';
import { queryKeys } from '../query_keys';
import type { ReportToastError } from '../telemetry';
import { classifyError, useReportToastError } from '../telemetry';

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

const workerSettingsConflictMessage = (name: string) =>
  i18n.translate('xpack.alertzero.workerSettingsConflictNamedErrorMessage', {
    defaultMessage: '{workerName} settings changed; reload and try again',
    values: { workerName: name },
  });

const WORKER_SETTINGS_FORBIDDEN_MESSAGE = i18n.translate(
  'xpack.alertzero.workerSettingsForbiddenErrorMessage',
  { defaultMessage: 'You do not have permission to update this worker' }
);

const workerSettingsForbiddenMessage = (name: string) =>
  i18n.translate('xpack.alertzero.workerSettingsForbiddenNamedErrorMessage', {
    defaultMessage: 'You do not have permission to update {workerName}',
    values: { workerName: name },
  });

const WORKER_UPDATE_ERROR_TITLE = i18n.translate('xpack.alertzero.workerUpdateErrorMessage', {
  defaultMessage: 'Unable to update the worker',
});

const workerUpdateErrorTitle = (name: string) =>
  i18n.translate('xpack.alertzero.workerUpdateNamedErrorTitle', {
    defaultMessage: 'Unable to update {workerName}',
    values: { workerName: name },
  });

const WORKER_UPDATE_UNKNOWN_REASON = i18n.translate('xpack.alertzero.workerUpdateUnknownReason', {
  defaultMessage: 'No response from the server',
});

/**
 * The reason to show for a failed HTTP request: the server's message, else "{status} {statusText}".
 * HTTP/2 responses have an empty statusText, so the status code may be all there is.
 */
const httpErrorReason = (error: unknown): string | undefined => {
  if (!isHttpFetchError(error)) {
    return undefined;
  }
  const body = error.body as { message?: unknown } | undefined;
  if (typeof body?.message === 'string' && body.message.trim() !== '') {
    return body.message;
  }
  const { status, statusText } = error.response ?? {};
  const fallback = `${status ?? ''} ${statusText ?? ''}`.trim();
  return fallback === '' ? undefined : fallback;
};

interface NotifyWorkerUpdateErrorOptions {
  /** Names the Worker in the toast; without it the toast uses the generic wording. */
  workerName?: string;
  /** Reports the toast as shown, for telemetry. */
  reportShown?: ReportToastError;
}

/** Shows the toast for a failed Worker update. */
export const notifyWorkerUpdateError = (
  toasts: IToasts,
  error: unknown,
  { workerName: name, reportShown }: NotifyWorkerUpdateErrorOptions = {}
): void => {
  reportShown?.(classifyError(error));
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  if (status === 409) {
    toasts.addWarning(
      name ? workerSettingsConflictMessage(name) : WORKER_SETTINGS_CONFLICT_MESSAGE
    );
    return;
  }
  if (status === 403) {
    toasts.addDanger(
      name ? workerSettingsForbiddenMessage(name) : WORKER_SETTINGS_FORBIDDEN_MESSAGE
    );
    return;
  }
  const cause = error instanceof Error ? error : new Error(String(error));
  // Without a response or a message, addError would show an empty toast body.
  const reason =
    httpErrorReason(error) ??
    (cause.message.trim() === '' ? WORKER_UPDATE_UNKNOWN_REASON : undefined);
  toasts.addError(cause, {
    title: name ? workerUpdateErrorTitle(name) : WORKER_UPDATE_ERROR_TITLE,
    ...(reason ? { toastMessage: reason } : {}),
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
  // Only the Watch settings page updates Workers through this hook.
  const reportShown = useReportToastError('watch_settings');

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
    onSuccess: (data) => {
      replaceWorkerInList(queryClient, queryKey, data.worker);
    },
    onError: (error, { workerId }) => {
      const cachedName = queryClient
        .getQueryData<ListWorkersResponse>(queryKey)
        ?.workers.find((worker) => worker.id === workerId)?.name;
      notifyWorkerUpdateError(services.notifications!.toasts, error, {
        workerName: workerName(workerId, cachedName),
        reportShown,
      });
    },
    // Awaited so mutateAsync resolves after the reload attempt. A failed reload surfaces as the
    // workers query error, which the Watch page uses to block Save.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
      // Hunt enable/disable/settings can change TI supply; refresh when present.
      await invalidateHuntThreatIntelSupplyStatus(queryClient);
      // The coverage answer switches between the last sweep and the role as the worker changes.
      await queryClient.invalidateQueries({ queryKey: queryKeys.huntWorkerIndexCoverage.all });
    },
  });
};
