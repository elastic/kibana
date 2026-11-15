/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient, type UseMutationResult } from '@kbn/react-query';
import type {
  PutSandboxSecretsRequest,
  PutSandboxSecretsResponse,
} from '@kbn/nightshift-investigations-plugin/common';
import { getHttpErrorStatus } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';
import { NIGHTSHIFT_SANDBOX_SECRETS_QUERY_KEY } from './use_fetch_sandbox_secrets';

const SAVE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sandboxSecrets.saveSuccessToastTitle',
  { defaultMessage: 'Sandbox secrets saved' }
);

const SAVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sandboxSecrets.saveErrorToastTitle',
  { defaultMessage: 'Failed to save sandbox secrets' }
);

const SAVE_CONFLICT_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sandboxSecrets.saveConflictToastTitle',
  {
    defaultMessage:
      'Sandbox secrets were changed by someone else. The latest keys were reloaded; review them and save again.',
  }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useSaveSandboxSecrets = ({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}): UseMutationResult<PutSandboxSecretsResponse, unknown, PutSandboxSecretsRequest> => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<PutSandboxSecretsResponse, unknown, PutSandboxSecretsRequest>({
    mutationFn: async (body) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/sandbox_secrets', {
        params: { body },
        // Closing the flyout must not abort a save that is already in flight.
        signal: null,
      });
    },
    onSuccess: async () => {
      notifications.toasts.addSuccess({ title: SAVE_SUCCESS_TOAST_TITLE });
      await queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_SANDBOX_SECRETS_QUERY_KEY });
      onSuccess?.();
    },
    onError: async (error) => {
      if (getHttpErrorStatus(error) === 409) {
        notifications.toasts.addWarning({ title: SAVE_CONFLICT_TOAST_TITLE });
        await queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_SANDBOX_SECRETS_QUERY_KEY });
        return;
      }
      notifications.toasts.addError(toError(error), { title: SAVE_ERROR_TOAST_TITLE });
    },
  });
};
