/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from './use_fetch_investigations';
import { useKibana } from './use_kibana';

const START_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.startInvestigation.successToastTitle',
  { defaultMessage: 'Investigation started' }
);

const START_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.startInvestigation.errorToastTitle',
  { defaultMessage: 'Failed to start investigation' }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

interface UseStartInvestigationResult {
  startInvestigation: (message: string) => void;
  isStarting: boolean;
}

/** Starts a manual investigation, which runs the deductive investigation workflow. */
export const useStartInvestigation = ({
  onStarted,
}: {
  onStarted?: () => void;
} = {}): UseStartInvestigationResult => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('POST /internal/nightshift/investigations', {
        params: { body: { subject: { type: 'manual' }, message } },
        // Closing the panel must not abort a start that is already in flight.
        signal: null,
      });
    },
    onSuccess: async () => {
      notifications.toasts.addSuccess({ title: START_SUCCESS_TOAST_TITLE });
      onStarted?.();
      await queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY });
    },
    onError: (error: unknown) => {
      notifications.toasts.addError(toError(error), { title: START_ERROR_TOAST_TITLE });
    },
  });

  return {
    startInvestigation: (message) => mutation.mutate(message),
    isStarting: mutation.isLoading,
  };
};
