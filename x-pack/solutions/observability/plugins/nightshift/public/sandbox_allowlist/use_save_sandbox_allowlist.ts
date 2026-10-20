/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient, type UseMutationResult } from '@kbn/react-query';
import type {
  PutSandboxAllowlistRequest,
  PutSandboxAllowlistResponse,
} from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { NIGHTSHIFT_SANDBOX_ALLOWLIST_QUERY_KEY } from './use_fetch_sandbox_allowlist';

const SAVE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sandboxAllowlist.saveSuccessToastTitle',
  { defaultMessage: 'Sandbox credential allowlist saved' }
);

const SAVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.nightshift.sandboxAllowlist.saveErrorToastTitle',
  { defaultMessage: 'Failed to save the sandbox credential allowlist' }
);

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const useSaveSandboxAllowlist = (): UseMutationResult<
  PutSandboxAllowlistResponse,
  unknown,
  PutSandboxAllowlistRequest
> => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<PutSandboxAllowlistResponse, unknown, PutSandboxAllowlistRequest>({
    mutationFn: async (body) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/sandbox_allowlist', {
        params: { body },
        signal: null,
      });
    },
    onSuccess: async () => {
      notifications.toasts.addSuccess({ title: SAVE_SUCCESS_TOAST_TITLE });
      await queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_SANDBOX_ALLOWLIST_QUERY_KEY });
    },
    onError: (error) => {
      notifications.toasts.addError(toError(error), { title: SAVE_ERROR_TOAST_TITLE });
    },
  });
};
