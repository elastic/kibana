/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { getFormattedError } from '../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from '../investigations/use_fetch_investigations';
import { invalidateSignificantEventQueries } from './invalidate_significant_event_queries';
import { markInvestigationStarted } from './recent_investigation_start';

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

const UNAVAILABLE_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.triggerEventInvestigation.unavailableError',
  { defaultMessage: 'Investigations are not available.' }
);

const MISSING_EPISODE_ERROR_MESSAGE = i18n.translate(
  'xpack.nightshift.triggerEventInvestigation.missingEpisodeError',
  { defaultMessage: 'This event has no alert to investigate yet.' }
);

type InvestigatedEvent = Pick<SignificantEventResponse, 'event_id' | 'episode_id'>;

/**
 * Starts an investigation of the event's alert, the same way the alerts UI does: an `alert` subject
 * keyed by the event's episode id, so an automation, Discovery and this action follow each other up.
 */
export const useTriggerEventInvestigation = ({
  onTriggered,
}: {
  /** `event` is the one the start was made for, which may no longer be the one shown. */
  onTriggered?: (investigationId: string, event: InvestigatedEvent) => void;
} = {}) => {
  const {
    notifications: { toasts },
    nightshiftInvestigations,
  } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  const mutation = useMutation<{ investigation_id: string }, Error, InvestigatedEvent>({
    mutationFn: async ({ episode_id: episodeId }) => {
      if (!episodeId) {
        throw new Error(MISSING_EPISODE_ERROR_MESSAGE);
      }
      if (!investigationsClient) {
        throw new Error(UNAVAILABLE_ERROR_MESSAGE);
      }
      return investigationsClient.fetch('POST /internal/nightshift/investigations', {
        params: { body: { subject: { type: 'alert', ids: [episodeId] } } },
        // Closing the flyout must not abort a start that is already in flight.
        signal: null,
      });
    },
    onSuccess: ({ investigation_id: investigationId }, event) => {
      // The events list polls for a minute after a start, until the new investigation is listed.
      markInvestigationStarted(queryClient);
      toasts.addSuccess({
        title: TRIGGER_SUCCESS_TOAST_TITLE,
        text: TRIGGER_SUCCESS_TOAST_TEXT,
      });
      onTriggered?.(investigationId, event);
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: TRIGGER_ERROR_TOAST_TITLE });
    },
    onSettled: () =>
      Promise.all([
        invalidateSignificantEventQueries(queryClient),
        // The event's investigation is read by subject, so a new start shows without a reload.
        queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY }),
      ]),
  });

  return {
    triggerInvestigation: (event: InvestigatedEvent) => mutation.mutate(event),
    triggeringEventId: mutation.isLoading ? mutation.variables?.event_id : undefined,
  };
};
