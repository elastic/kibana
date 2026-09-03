/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { IToasts } from '@kbn/core/public';
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
import { retryOnTransientError } from './retry_on_transient_error';

const WATCH_SETTINGS_CONFLICT_MESSAGE = i18n.translate(
  'xpack.pnd.watchSettingsConflictErrorMessage',
  { defaultMessage: 'Watch settings changed; reload and try again' }
);

const WATCH_SETTINGS_FORBIDDEN_MESSAGE = i18n.translate(
  'xpack.pnd.watchSettingsForbiddenErrorMessage',
  { defaultMessage: 'You do not have permission to update this watch' }
);

const WATCH_UPDATE_ERROR_TITLE = i18n.translate('xpack.pnd.watchUpdateErrorMessage', {
  defaultMessage: 'Unable to update the watch',
});

/**
 * 409/403 are expected outcomes — warning/danger without a stack. Everything else is addError.
 */
export const notifyWatchUpdateError = (toasts: IToasts, error: unknown): void => {
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  if (status === 409) {
    toasts.addWarning(WATCH_SETTINGS_CONFLICT_MESSAGE);
    return;
  }
  if (status === 403) {
    toasts.addDanger(WATCH_SETTINGS_FORBIDDEN_MESSAGE);
    return;
  }
  const cause = error instanceof Error ? error : new Error(String(error));
  toasts.addError(cause, { title: WATCH_UPDATE_ERROR_TITLE });
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
 * Optimistic, so the page reflects the write immediately and rolls back if the server rejects it —
 * which matters most for the settings page's Save, where a whole page of accumulated edits rides in
 * one request and a rejection has to put every one of them back.
 *
 * Deliberately does not invalidate the skill catalog: a per-watch attachment toggle does not
 * change a skill's global flag. The worker catalog is not invalidated either, for a stronger reason —
 * it is projected from the lanes' `ai.agent` steps and nothing this route accepts can change it.
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
      notifyWatchUpdateError(services.notifications!.toasts, error);
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
 *
 * `autonomyLevel` is deliberately absent: the route rejects it (autonomy is written only by
 * `PUT /internal/pnd/autonomy`, behind `pnd_manage_autonomy`), so mirroring it here would paint a
 * raise the server never applied and then roll it back. `worker` is absent for the same reason and one
 * more: a worker is a read-only projection of an `ai.agent` step (kibana-phf4.6), so a watch carries
 * no worker state for a mirror to write to. `approvalGates` joined them in bead kibana-phf4.33: the
 * 2026-08-10 design deleted the section that rendered them and the route now rejects the field, so a
 * mirror could only paint a gate policy the server refused.
 */
const applyWatchPatch = (
  current: GetWatchResponse,
  patch: UpdateWatchRequestBody
): GetWatchResponse => {
  const { enabled, triggers, scopeRouting, skill } = patch;
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
