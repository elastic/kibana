/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../utils/errors';

interface CleanupStaleEventsResponse {
  scanned: number;
  closed: number;
  kept: number;
  skipped: number;
}

const NO_EVENTS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.settings.staleEventCleanup.noEventsTitle',
  { defaultMessage: 'No stale events found' }
);

const ERROR_TOAST_TITLE = i18n.translate('xpack.nightshift.settings.staleEventCleanup.errorTitle', {
  defaultMessage: 'Failed to clean up stale events',
});

export const useCleanupStaleEvents = () => {
  const {
    notifications: { toasts },
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<CleanupStaleEventsResponse, Error, void>({
    mutationFn: () =>
      significantEventsRepositoryClient.fetch('POST /internal/significant_events/events/_cleanup', {
        signal: null,
      }),
    onSuccess: (result) => {
      toasts.addSuccess({
        title:
          result.closed === 0
            ? NO_EVENTS_TOAST_TITLE
            : i18n.translate('xpack.nightshift.settings.staleEventCleanup.successTitle', {
                defaultMessage:
                  '{count, plural, one {Closed # stale event} other {Closed # stale events}}',
                values: { count: result.closed },
              }),
      });
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['nightshift.eventById'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['nightshift.eventLifecycle'], exact: false }),
      ]);
    },
  });

  return {
    cleanupStaleEvents: () => mutation.mutate(),
    isCleaningUp: mutation.isLoading,
  };
};
