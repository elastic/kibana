/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { bulkDeactivateEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import { INVALID_ALERT_STATE_TRANSITION_CODE } from '@kbn/alerting-v2-schemas';
import { operatorFallbackAssessmentNote } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

interface DeactivateSignificantEventArgs {
  /** The `alert.id` of the series' latest version, which `deactivate` takes as its target. */
  episodeId?: string;
  /** Closure note; when empty or whitespace-only, a standard note is recorded. */
  reason?: string;
}

type DeactivateOutcome = 'deactivated' | 'already_inactive';

const DEACTIVATE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.successToastTitle',
  {
    defaultMessage: 'Significant event marked inactive',
  }
);

const DEACTIVATE_ALREADY_INACTIVE_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.alreadyInactiveToastTitle',
  {
    defaultMessage:
      'No change made: the significant event is already inactive or was changed by another update',
  }
);

const DEACTIVATE_FORBIDDEN_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.forbiddenToastTitle',
  {
    defaultMessage:
      'Marking a significant event inactive requires the Alerting v2 "alerts write" privilege',
  }
);

const DEACTIVATE_MISSING_EPISODE_MESSAGE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.missingEpisodeMessage',
  {
    defaultMessage:
      'Refresh the list and try again. This event has no Alerting v2 episode to mark inactive.',
  }
);

const DEACTIVATE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.errorToastTitle',
  {
    defaultMessage: 'Failed to mark significant event inactive',
  }
);

const DEACTIVATE_FALLBACK_ERROR_MESSAGE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.updateEvent.fallbackErrorMessage',
  {
    defaultMessage: 'Refresh the list and try again.',
  }
);

const isForbidden = (error: Error): boolean => {
  const { response } = error as Partial<IHttpFetchError>;
  return response?.status === 403;
};

export const useUpdateSignificantEvent = ({
  onUpdateSuccess,
}: { onUpdateSuccess?: () => void } = {}) => {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    DeactivateOutcome,
    Error,
    DeactivateSignificantEventArgs & { episodeId: string }
  >({
    mutationFn: async ({ episodeId, reason }) => {
      const { affected_count: affectedCount, errors } = await bulkDeactivateEpisodeActions(http, [
        {
          alert_id: episodeId,
          reason: reason?.trim() || operatorFallbackAssessmentNote('inactive'),
        },
      ]);
      if (affectedCount > 0) {
        return 'deactivated';
      }
      const [firstError] = errors;
      if (firstError?.error.code === INVALID_ALERT_STATE_TRANSITION_CODE) {
        return 'already_inactive';
      }
      throw new Error(firstError?.error.message ?? DEACTIVATE_FALLBACK_ERROR_MESSAGE);
    },
    onSuccess: (outcome) => {
      if (outcome === 'already_inactive') {
        toasts.addInfo({ title: DEACTIVATE_ALREADY_INACTIVE_TOAST_TITLE });
      } else {
        toasts.addSuccess({ title: DEACTIVATE_SUCCESS_TOAST_TITLE });
      }
      onUpdateSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, {
        title: isForbidden(error) ? DEACTIVATE_FORBIDDEN_TOAST_TITLE : DEACTIVATE_ERROR_TOAST_TITLE,
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['significantEvents'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['significantEventLifecycle'], exact: false }),
      ]);
    },
  });

  return {
    deactivateEvent: ({ episodeId, reason }: DeactivateSignificantEventArgs) => {
      if (!episodeId) {
        toasts.addError(new Error(DEACTIVATE_MISSING_EPISODE_MESSAGE), {
          title: DEACTIVATE_ERROR_TOAST_TITLE,
        });
        return;
      }
      mutation.mutate({ episodeId, reason });
    },
    isUpdating: mutation.isLoading,
  };
};
