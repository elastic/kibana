/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';

const CLOSE_SUCCESS_TOAST_TITLE = i18n.translate('xpack.nightshift.closeEvent.successToastTitle', {
  defaultMessage: 'Significant event marked inactive',
});

const CLOSE_ERROR_TOAST_TITLE = i18n.translate('xpack.nightshift.closeEvent.errorToastTitle', {
  defaultMessage: 'Failed to mark significant event inactive',
});

const EVENT_NOT_FOUND_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.closeEvent.eventNotFoundErrorMessage',
  {
    defaultMessage: 'The significant event no longer exists.',
  }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface UseCloseSignificantEventResult {
  closeSignificantEvent: (eventId: string, assessmentNote: string) => void;
  closingEventId?: string;
}

export const useCloseSignificantEvent = (): UseCloseSignificantEventResult => {
  const {
    notifications,
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const [closingEventId, setClosingEventId] = useState<string>();

  const mutation = useMutation({
    mutationFn: ({ eventId, assessmentNote }: { eventId: string; assessmentNote: string }) =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/events/{id}/update',
        {
          params: {
            path: { id: eventId },
            body: { status: 'inactive', assessment_note: assessmentNote },
          },
          // Unmounting the list must not abort an update that is already in flight.
          signal: null,
        }
      ),
    onMutate: ({ eventId }) => {
      setClosingEventId(eventId);
    },
    onSuccess: ({ found }, { eventId }) => {
      if (!found) {
        notifications.toasts.addError(new Error(EVENT_NOT_FOUND_ERROR_MESSAGE), {
          title: CLOSE_ERROR_TOAST_TITLE,
        });
        return;
      }

      queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
        (current) =>
          current
            ? {
                ...current,
                hits: current.hits.map((event) =>
                  event.event_id === eventId
                    ? {
                        ...event,
                        status: 'inactive' as const,
                      }
                    : event
                ),
              }
            : current
      );
      notifications.toasts.addSuccess({ title: CLOSE_SUCCESS_TOAST_TITLE });
    },
    onError: (error: unknown) => {
      notifications.toasts.addError(toError(error), { title: CLOSE_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      setClosingEventId(undefined);
      await queryClient.invalidateQueries({
        queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
      });
    },
  });

  return {
    closeSignificantEvent: (eventId, assessmentNote) =>
      mutation.mutate({ eventId, assessmentNote: assessmentNote.trim() }),
    closingEventId,
  };
};
