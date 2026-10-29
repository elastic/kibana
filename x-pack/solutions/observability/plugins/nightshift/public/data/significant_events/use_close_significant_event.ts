/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { bulkDeactivateEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import { INVALID_ALERT_STATE_TRANSITION_CODE } from '@kbn/alerting-v2-schemas';
import { operatorFallbackAssessmentNote } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import { invalidateSignificantEventQueries } from '../data/significant_events/invalidate_significant_event_queries';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';

const CLOSE_SUCCESS_TOAST_TITLE = i18n.translate('xpack.nightshift.closeEvent.successToastTitle', {
  defaultMessage: 'Significant event marked inactive',
});

const CLOSE_NO_CHANGE_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.closeEvent.noChangeToastTitle',
  {
    defaultMessage: 'No change made: the significant event is already inactive or no longer exists',
  }
);

const CLOSE_ERROR_TOAST_TITLE = i18n.translate('xpack.nightshift.closeEvent.errorToastTitle', {
  defaultMessage: 'Failed to mark significant event inactive',
});

const CLOSE_FORBIDDEN_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.closeEvent.forbiddenToastTitle',
  {
    defaultMessage: 'You do not have permission to mark this significant event inactive',
  }
);

const CLOSE_FALLBACK_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.closeEvent.fallbackErrorMessage',
  {
    defaultMessage: 'Refresh the list and try again.',
  }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const markEventInactive = (
  current: NightshiftSignificantEventsQueryData | undefined,
  eventId: string
): NightshiftSignificantEventsQueryData | undefined =>
  current && {
    ...current,
    hits: current.hits.map((event) =>
      event.event_id === eventId ? { ...event, status: 'inactive' as const } : event
    ),
  };

type CloseOutcome = 'closed' | 'already_inactive';

interface CloseSignificantEventArgs {
  eventId: string;
  episodeId?: string;
  reason?: string;
}

interface UseCloseSignificantEventResult {
  closeSignificantEvent: (args: CloseSignificantEventArgs) => void;
  closingEventId?: string;
}

export const useCloseSignificantEvent = ({
  onClosed,
}: {
  onClosed?: () => void;
} = {}): UseCloseSignificantEventResult => {
  const { notifications, http } = useKibana().services;
  const queryClient = useQueryClient();
  const [closingEventId, setClosingEventId] = useState<string>();

  const mutation = useMutation<
    CloseOutcome,
    Error,
    CloseSignificantEventArgs & { episodeId: string }
  >({
    mutationFn: async ({ episodeId, reason }) => {
      const { affected_count: affectedCount, errors } = await bulkDeactivateEpisodeActions(http, [
        {
          alert_id: episodeId,
          reason: reason?.trim() || operatorFallbackAssessmentNote('inactive'),
        },
      ]);
      if (affectedCount > 0) {
        return 'closed';
      }
      const [firstError] = errors;
      if (firstError?.error.code === INVALID_ALERT_STATE_TRANSITION_CODE) {
        return 'already_inactive';
      }
      throw new Error(firstError?.error.message ?? CLOSE_FALLBACK_ERROR_MESSAGE);
    },
    onMutate: ({ eventId }) => {
      setClosingEventId(eventId);
    },
    onSuccess: (outcome, { eventId }) => {
      // The invalidation in `onSettled` refetches the list.
      if (outcome === 'already_inactive') {
        notifications.toasts.addInfo({ title: CLOSE_NO_CHANGE_TOAST_TITLE });
        onClosed?.();
        return;
      }
      queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
        (current) => markEventInactive(current, eventId)
      );
      notifications.toasts.addSuccess({ title: CLOSE_SUCCESS_TOAST_TITLE });
      onClosed?.();
    },
    onError: (error: unknown) => {
      const normalized = toError(error);
      const { response } = normalized as Partial<IHttpFetchError>;
      const title =
        response?.status === 403 ? CLOSE_FORBIDDEN_TOAST_TITLE : CLOSE_ERROR_TOAST_TITLE;
      notifications.toasts.addError(normalized, { title });
    },
    onSettled: async () => {
      setClosingEventId(undefined);
      await invalidateSignificantEventQueries(queryClient);
    },
  });

  return {
    closeSignificantEvent: ({ eventId, episodeId, reason }) => {
      if (!episodeId) {
        notifications.toasts.addError(new Error(CLOSE_FALLBACK_ERROR_MESSAGE), {
          title: CLOSE_ERROR_TOAST_TITLE,
        });
        return;
      }
      mutation.mutate({ eventId, episodeId, reason });
    },
    closingEventId,
  };
};
