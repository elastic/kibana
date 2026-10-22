/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  stateBlocksNewActivity,
  type SignificantEventsMaintenanceStatus,
  type SignificantEventsMaintenanceSummary,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { getActivityBlockTooltip } from '../../common/activity_block_tooltip';
import { getFormattedError } from '../../common/errors';

const MAINTENANCE_STATUS_QUERY_KEY = ['nightshiftMaintenanceStatus'] as const;
const MAINTENANCE_MUTATION_KEY = ['nightshiftMaintenance'] as const;

const PAUSE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.pauseSuccessToastTitle',
  { defaultMessage: 'Paused significant events activity' }
);

const PAUSE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.pauseErrorToastTitle',
  { defaultMessage: 'Failed to pause significant events activity' }
);

const RESUME_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resumeSuccessToastTitle',
  { defaultMessage: 'Resumed significant events activity' }
);

const RESUME_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resumeErrorToastTitle',
  { defaultMessage: 'Failed to resume significant events activity' }
);

const RESET_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resetSuccessToastTitle',
  { defaultMessage: 'Reset Significant Events data' }
);
const RESET_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resetErrorToastTitle',
  { defaultMessage: 'Failed to reset Significant Events data' }
);
const RESET_WARNINGS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resetWarningsToastTitle',
  { defaultMessage: 'Reset Significant Events data with warnings' }
);

const PAUSE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.pausePartialToastTitle',
  { defaultMessage: 'Paused, but some items could not be stopped' }
);

const RESUME_WARNINGS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.maintenance.resumeWarningsToastTitle',
  { defaultMessage: 'Resumed significant events activity with warnings' }
);

const partialFailuresText = (count: number) =>
  i18n.translate('xpack.nightshift.settings.maintenance.partialFailuresText', {
    defaultMessage:
      '{count, plural, one {# operation} other {# operations}} could not be completed. Check the Kibana server logs for details.',
    values: { count },
  });

// The state belongs to the current space and can be changed from another tab or
// user, so poll periodically and on window focus to avoid acting on a stale status.
const MAINTENANCE_STATUS_REFETCH_INTERVAL_MS = 30_000;

/** Reads the persisted maintenance state. Cached under a shared key so every
 * consumer (settings control, discovery callout, toggles) sees a single source
 * of truth. */
export const useMaintenanceStatus = () => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useQuery<SignificantEventsMaintenanceStatus, Error>({
    queryKey: MAINTENANCE_STATUS_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/maintenance/_status',
        {
          signal: signal ?? null,
        }
      ),
    refetchInterval: MAINTENANCE_STATUS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

/**
 * Whether new Significant Events activity should be blocked in the UI.
 * `isBlocked` is true only once status is known and blocking.
 * `blocksActivity` is also true while status is loading or the status query
 * failed (pessimistic) so enable toggles / run buttons do not look available
 * when pause state is unknown.
 * `activityBlockTooltip` explains why controls are disabled (loading, error, or paused).
 */
export const useBlocksNewActivity = (): {
  blocksActivity: boolean;
  isBlocked: boolean;
  isLoading: boolean;
  isError: boolean;
  status: SignificantEventsMaintenanceStatus | undefined;
  activityBlockTooltip: string | undefined;
} => {
  const { data: status, isLoading, isError } = useMaintenanceStatus();
  const isBlocked = status ? stateBlocksNewActivity(status.state) : false;
  const blocksActivity = isLoading || isError || isBlocked;
  const activityBlockTooltip = getActivityBlockTooltip({ isLoading, isError, isBlocked });
  return { blocksActivity, isBlocked, isLoading, isError, status, activityBlockTooltip };
};

/** Maintenance actions share mutation status and invalidate the persisted status query. */
export const useSignificantEventsMaintenanceActions = () => {
  const {
    notifications: { toasts },
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const isMutating = useIsMutating({ mutationKey: MAINTENANCE_MUTATION_KEY }) > 0;

  const invalidateStatus = () => {
    void queryClient.invalidateQueries({ queryKey: MAINTENANCE_STATUS_QUERY_KEY });
  };

  const pauseMutation = useMutation<SignificantEventsMaintenanceSummary, Error, void>({
    mutationKey: MAINTENANCE_MUTATION_KEY,
    mutationFn: () =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/maintenance/_pause',
        {
          signal: null,
        }
      ),
    onSuccess: (summary) => {
      if (summary.partialFailures.length > 0) {
        toasts.addWarning({
          title: PAUSE_PARTIAL_TOAST_TITLE,
          text: partialFailuresText(summary.partialFailures.length),
        });
      } else {
        toasts.addSuccess({ title: PAUSE_SUCCESS_TOAST_TITLE });
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: PAUSE_ERROR_TOAST_TITLE });
    },
    onSettled: invalidateStatus,
  });

  const resumeMutation = useMutation<SignificantEventsMaintenanceSummary, Error, void>({
    mutationKey: MAINTENANCE_MUTATION_KEY,
    mutationFn: () =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/maintenance/_resume',
        {
          signal: null,
        }
      ),
    onSuccess: (summary) => {
      // Resume always flips the control plane to enabled (or throws). Partial
      // re-enable failures are warnings, not a lingering paused state.
      if (summary.partialFailures.length > 0) {
        toasts.addWarning({
          title: RESUME_WARNINGS_TOAST_TITLE,
          text: partialFailuresText(summary.partialFailures.length),
        });
      } else {
        toasts.addSuccess({ title: RESUME_SUCCESS_TOAST_TITLE });
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: RESUME_ERROR_TOAST_TITLE });
    },
    onSettled: invalidateStatus,
  });

  const resetMutation = useMutation<SignificantEventsMaintenanceSummary, Error, void>({
    mutationKey: MAINTENANCE_MUTATION_KEY,
    mutationFn: () =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/maintenance/_reset',
        { signal: null }
      ),
    onSuccess: (summary) => {
      const { deleted } = summary;
      const deletedText = deleted
        ? i18n.translate('xpack.nightshift.settings.maintenance.resetDeletedDescription', {
            defaultMessage:
              'Deleted {knowledgeIndicators, number} knowledge indicators, {storedQueries, number} stored queries, and {rules, number} rules in this space; removed documents from {dataStreams, number} data streams.',
            values: {
              knowledgeIndicators: deleted.knowledgeIndicators,
              storedQueries: deleted.storedQueries,
              rules: deleted.rules,
              dataStreams: deleted.dataStreams,
            },
          })
        : undefined;
      if (summary.partialFailures.length > 0) {
        toasts.addWarning({
          title: RESET_WARNINGS_TOAST_TITLE,
          text: [deletedText, partialFailuresText(summary.partialFailures.length)]
            .filter(Boolean)
            .join(' '),
        });
      } else {
        toasts.addSuccess({ title: RESET_SUCCESS_TOAST_TITLE, text: deletedText });
      }
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: RESET_ERROR_TOAST_TITLE });
    },
    onSettled: (_summary, error) => {
      if (error) {
        invalidateStatus();
      } else {
        void queryClient.invalidateQueries({ type: 'active' });
      }
    },
  });

  return {
    pause: () => pauseMutation.mutate(),
    resume: () => resumeMutation.mutate(),
    isPausing: pauseMutation.isLoading,
    reset: () => resetMutation.mutate(),
    isResetting: resetMutation.isLoading,
    isMutating,
  };
};
