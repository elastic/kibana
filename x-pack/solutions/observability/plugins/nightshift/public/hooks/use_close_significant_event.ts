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
  defaultMessage: 'Significant event closed',
});

const CLOSE_ERROR_TOAST_TITLE = i18n.translate('xpack.nightshift.closeEvent.errorToastTitle', {
  defaultMessage: 'Failed to close significant event',
});

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface UseCloseSignificantEventResult {
  closeSignificantEvent: (eventUuid: string) => void;
  closingEventUuid?: string;
}

export const useCloseSignificantEvent = (): UseCloseSignificantEventResult => {
  const {
    notifications,
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const [closingEventUuid, setClosingEventUuid] = useState<string>();

  const mutation = useMutation({
    mutationFn: (eventUuid: string) =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/events/{id}/update',
        {
          params: {
            path: { id: eventUuid },
            body: { status: 'closed' },
          },
          // Unmounting the list must not abort a close that is already in flight.
          signal: null,
        }
      ),
    onMutate: (eventUuid) => {
      setClosingEventUuid(eventUuid);
    },
    onSuccess: (response, eventUuid) => {
      queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
        (current) =>
          current
            ? {
                ...current,
                hits: current.hits.map((event) =>
                  event.event_uuid === eventUuid
                    ? {
                        ...event,
                        event_uuid: response.event_uuid,
                        previous_event_uuid: eventUuid,
                        status: 'closed',
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
      setClosingEventUuid(undefined);
      await queryClient.invalidateQueries({
        queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
      });
    },
  });

  return {
    closeSignificantEvent: (eventUuid) => mutation.mutate(eventUuid),
    closingEventUuid,
  };
};
