/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@kbn/react-query';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';

const QUERY_KEY = ['nightshift.investigatorServiceAccount'] as const;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Reads whether Nightshift is set up with its service account in the current space. */
export const useInvestigatorServiceAccount = (): UseQueryResult<
  InvestigatorServiceAccountStatus,
  Error
> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<InvestigatorServiceAccountStatus, Error>({
    queryKey: QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigations/service_account', {
        signal: signal ?? null,
      });
    },
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });
};

/** Sets up Nightshift in the current space: creates the service account and binds its workflows. */
export const useSetUpNightshiftServiceAccount = (): UseMutationResult<
  InvestigatorServiceAccountStatus,
  unknown,
  void
> => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<InvestigatorServiceAccountStatus, unknown, void>({
    mutationFn: async () => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch(
        'POST /internal/nightshift/investigations/service_account/_enable',
        { signal: null }
      );
    },
    onSuccess: (status) => {
      queryClient.setQueryData(QUERY_KEY, status);
    },
    onError: (error) => {
      // A failed setup may have done part of its work; read the status again.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      notifications.toasts.addError(toError(error), {
        title: i18n.translate('xpack.nightshift.serviceAccount.setupErrorToastTitle', {
          defaultMessage: 'Failed to set up the Nightshift service account',
        }),
      });
    },
  });
};

/**
 * Nightshift is usable in a space once service accounts are on and its investigation entry point
 * is installed, enabled, and bound to the space's agent account.
 */
export const isNightshiftSetUp = (status: InvestigatorServiceAccountStatus | undefined): boolean =>
  status?.serviceAccountsEnabled === true &&
  status.installed === true &&
  status.enabled === true &&
  status.bound === true;
