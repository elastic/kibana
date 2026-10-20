/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useState } from 'react';
import { getFormattedError } from '../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import { NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY } from '../../hooks/use_fetch_significant_events';

const TRIGGER_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.triggerEventInvestigation.successToastTitle',
  { defaultMessage: 'Investigation started' }
);

const TRIGGER_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.nightshift.triggerEventInvestigation.successToastText',
  {
    defaultMessage:
      'The investigation workflow has been triggered. Results will appear once it completes.',
  }
);

const TRIGGER_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.triggerEventInvestigation.errorToastTitle',
  { defaultMessage: 'Failed to start investigation' }
);

const EVENT_QUERY_KEYS = [
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  ['nightshift.significantEventsList'],
  ['nightshift.eventById'],
  ['nightshift.eventLifecycle'],
] as const;

export const useTriggerEventInvestigation = ({
  onTriggered,
}: {
  onTriggered?: () => void;
} = {}) => {
  const {
    notifications: { toasts },
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const [triggeringEventId, setTriggeringEventId] = useState<string>();

  const mutation = useMutation<{ executionId: string }, Error, string>({
    mutationFn: (eventId) =>
      significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/events/{id}/investigate',
        {
          params: { path: { id: eventId } },
          signal: null,
        }
      ),
    onMutate: setTriggeringEventId,
    onSuccess: () => {
      toasts.addSuccess({
        title: TRIGGER_SUCCESS_TOAST_TITLE,
        text: TRIGGER_SUCCESS_TOAST_TEXT,
      });
      onTriggered?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: TRIGGER_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      setTriggeringEventId(undefined);
      await Promise.all(
        EVENT_QUERY_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, exact: false })
        )
      );
    },
  });

  return {
    triggerInvestigation: (eventId: string) => mutation.mutate(eventId),
    triggeringEventId,
  };
};
