/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';

interface TriggerInvestigationResult {
  investigation_id: string;
}

const TRIGGER_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.triggerInvestigation.successToastTitle',
  {
    defaultMessage: 'Investigation started',
  }
);

const TRIGGER_SUCCESS_TOAST_TEXT = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.triggerInvestigation.successToastText',
  {
    defaultMessage:
      'The investigation workflow has been triggered. Results will appear once it completes.',
  }
);

const TRIGGER_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.triggerInvestigation.errorToastTitle',
  {
    defaultMessage: 'Failed to start investigation',
  }
);

export const useTriggerInvestigation = ({
  onTriggerSuccess,
}: { onTriggerSuccess?: () => void } = {}) => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies,
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<TriggerInvestigationResult, Error, SignificantEvent>({
    mutationFn: (event: SignificantEvent) => {
      const investigationsClient =
        dependencies.start.nightshiftInvestigations?.investigationsClient;
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const {
        title,
        summary,
        stream_names,
        event_uuid,
        event_id,
        status,
        severity,
        confidence,
        causal_features,
        blast_radius,
      } = event;

      return investigationsClient.fetch('POST /internal/nightshift/investigations', {
        params: {
          body: {
            subject: { type: 'significant_event', id: event_id, summary },
            title,
            message: `${title}\n\n${summary}`,
            stream_names: stream_names ?? [],
            concurrency_key: event_id,
            context: {
              event_uuid,
              event_id,
              status,
              severity,
              confidence,
              causal_features: causal_features ?? [],
              blast_radius: blast_radius ?? [],
            },
          },
        },
        signal: null,
      });
    },
    onSuccess: () => {
      toasts.addSuccess({
        title: TRIGGER_SUCCESS_TOAST_TITLE,
        text: TRIGGER_SUCCESS_TOAST_TEXT,
      });
      onTriggerSuccess?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: TRIGGER_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['significantEventLifecycle'],
        exact: false,
      });
    },
  });

  return {
    triggerInvestigation: (event: SignificantEvent) => mutation.mutate(event),
    isTriggering: mutation.isLoading,
  };
};
