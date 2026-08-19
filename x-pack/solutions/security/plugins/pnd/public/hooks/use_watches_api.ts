/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS, PND_WATCHES_URL, buildWatchUrl } from '@kbn/pnd-common';
import type {
  GetWatchResponse,
  ListWatchesResponse,
  UpdateWatchRequestBody,
  UpdateWatchResponse,
} from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';

export const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

const getWatchUpdateErrorTitle = (status: number | undefined): string => {
  if (status === 409) {
    return i18n.translate('xpack.pnd.watchSettingsConflictErrorMessage', {
      defaultMessage: 'Watch settings changed; reload and try again',
    });
  }
  if (status === 403) {
    return i18n.translate('xpack.pnd.watchSettingsSpaceDisabledErrorMessage', {
      defaultMessage: 'PND watches are disabled in this space',
    });
  }
  return i18n.translate('xpack.pnd.watchUpdateErrorMessage', {
    defaultMessage: 'Unable to update the watch',
  });
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

/**
 * Patches a watch and its settings in one request. Bound to a single watch, so callers pass only the
 * fields that changed.
 *
 * Optimistic, so switches and sliders respond immediately and roll back if the server rejects the
 * value. Deliberately does not invalidate the worker or skill catalogs: a per-watch attachment toggle
 * does not change a worker's or skill's global flag.
 */
export const useUpdateWatch = (watchId: string) => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.watches.detail(watchId);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());

  return useMutation({
    mutationFn: (patch: UpdateWatchRequestBody): Promise<UpdateWatchResponse> => {
      const execute = async (): Promise<UpdateWatchResponse> => {
        const current = queryClient.getQueryData<GetWatchResponse>(queryKey);
        const body = touchesSettings(patch)
          ? { ...patch, settingsRevision: current?.settingsRevision ?? null }
          : patch;
        const response = await services.http!.patch<UpdateWatchResponse>(buildWatchUrl(watchId), {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify(body),
        });
        queryClient.setQueryData(queryKey, response);
        return response;
      };
      const operation = mutationQueue.current.then(execute, execute);
      mutationQueue.current = operation.then(
        () => undefined,
        () => undefined
      );
      return operation;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<GetWatchResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<GetWatchResponse>(queryKey, applyWatchPatch(previous, patch));
      }
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      const status = isHttpFetchError(error) ? error.response?.status : undefined;
      const cause = error instanceof Error ? error : new Error(String(error));
      services.notifications!.toasts.addError(cause, { title: getWatchUpdateErrorTitle(status) });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
      // The list carries `enabled` and drives the subnav, so it has to follow the toggle.
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
    },
  });
};

/**
 * Mirrors what the server does to a watch, so the optimistic cache matches the eventual response.
 * Only fields the UI can change are handled; unknown option ids are left to the server to reject.
 */
const applyWatchPatch = (
  current: GetWatchResponse,
  patch: UpdateWatchRequestBody
): GetWatchResponse => {
  const { enabled, autonomyLevel, triggers, scopeRouting, approvalGate, worker, skill } = patch;
  const watch = enabled == null ? current.watch : { ...current.watch, enabled };
  const settings = current.settings;

  if (!settings) {
    return { ...current, watch };
  }

  return {
    ...current,
    watch,
    settings: {
      ...settings,
      autonomy: autonomyLevel ?? settings.autonomy,
      triggers:
        triggers && settings.triggers
          ? {
              ...settings.triggers,
              allowManualRun: triggers.allowManualRun ?? settings.triggers.allowManualRun,
              schedule:
                triggers.scheduleId == null
                  ? settings.triggers.schedule
                  : { ...settings.triggers.schedule, selectedId: triggers.scheduleId },
            }
          : settings.triggers,
      scopeRouting:
        scopeRouting && settings.scopeRouting
          ? {
              ...settings.scopeRouting,
              dataSources: applySelect(settings.scopeRouting.dataSources, scopeRouting.dataSources),
              assigneeQueue: applySelect(
                settings.scopeRouting.assigneeQueue,
                scopeRouting.assigneeQueue
              ),
              escalationContact: applySelect(
                settings.scopeRouting.escalationContact,
                scopeRouting.escalationContact
              ),
            }
          : settings.scopeRouting,
      approvalGates: approvalGate
        ? settings.approvalGates?.map((gate) =>
            gate.id === approvalGate.gateId
              ? {
                  ...gate,
                  requirement: approvalGate.requirement ?? gate.requirement,
                  approverRoleId: approvalGate.approverRoleId ?? gate.approverRoleId,
                }
              : gate
          )
        : settings.approvalGates,
      workers: worker
        ? settings.workers?.map((attachment) =>
            attachment.workerId === worker.workerId
              ? { ...attachment, enabled: worker.enabled }
              : attachment
          )
        : settings.workers,
      skills: skill
        ? settings.skills?.map((attachment) =>
            attachment.skillId === skill.skillId
              ? { ...attachment, enabled: skill.enabled }
              : attachment
          )
        : settings.skills,
    },
  };
};

const touchesSettings = ({
  autonomyLevel,
  triggers,
  scopeRouting,
  approvalGate,
  worker,
  skill,
}: UpdateWatchRequestBody): boolean =>
  autonomyLevel != null ||
  triggers != null ||
  scopeRouting != null ||
  approvalGate != null ||
  worker != null ||
  skill != null;

const applySelect = <T extends { selectedId: string }>(setting: T, selectedId?: string): T =>
  selectedId == null ? setting : { ...setting, selectedId };
