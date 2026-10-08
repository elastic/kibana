/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient, type UseMutationResult } from '@kbn/react-query';
import type {
  PutCustomContextRequest,
  PutCustomContextResponse,
} from '@kbn/nightshift-investigations-plugin/common';
import { getHttpErrorStatus } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';
import { NIGHTSHIFT_CUSTOM_CONTEXT_QUERY_KEY } from './use_fetch_custom_context';

const SAVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.customContext.saveErrorToastTitle',
  { defaultMessage: 'Failed to save custom context' }
);

const SAVE_CONFLICT_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.customContext.saveConflictToastTitle',
  {
    defaultMessage:
      'Custom context was changed by someone else. The latest snippets were reloaded; try again.',
  }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useSaveCustomContext = ({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}): UseMutationResult<PutCustomContextResponse, unknown, PutCustomContextRequest> => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<PutCustomContextResponse, unknown, PutCustomContextRequest>({
    mutationFn: async (body) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/custom_context', {
        params: { body },
        // Closing the flyout must not abort a save that is already in flight.
        signal: null,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(NIGHTSHIFT_CUSTOM_CONTEXT_QUERY_KEY, response);
      onSuccess?.();
    },
    onError: async (error) => {
      if (getHttpErrorStatus(error) === 409) {
        notifications.toasts.addWarning({ title: SAVE_CONFLICT_TOAST_TITLE });
        await queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_CUSTOM_CONTEXT_QUERY_KEY });
        return;
      }
      notifications.toasts.addError(toError(error), { title: SAVE_ERROR_TOAST_TITLE });
    },
  });
};
