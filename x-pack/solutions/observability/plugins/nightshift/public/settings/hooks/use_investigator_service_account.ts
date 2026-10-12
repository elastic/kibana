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
import { isHttpClientError } from '../../common/http_error';
import { useKibana } from '../../hooks/use_kibana';

const QUERY_KEY = ['nightshift.investigatorServiceAccount'] as const;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Reads whether investigations in the current space run as the Nightshift service account. */
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

/** Binds (`enable`) or unbinds (`disable`) the current space to the Nightshift service account. */
export const useSetInvestigatorServiceAccount = (): UseMutationResult<
  InvestigatorServiceAccountStatus,
  unknown,
  'enable' | 'disable'
> => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<InvestigatorServiceAccountStatus, unknown, 'enable' | 'disable'>({
    mutationFn: async (action) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return action === 'enable'
        ? investigationsClient.fetch(
            'POST /internal/nightshift/investigations/service_account/_enable',
            { signal: null }
          )
        : investigationsClient.fetch(
            'POST /internal/nightshift/investigations/service_account/_disable',
            { signal: null }
          );
    },
    onSuccess: (status) => {
      queryClient.setQueryData(QUERY_KEY, status);
    },
    onError: (error) => {
      notifications.toasts.addError(toError(error), {
        title: i18n.translate('xpack.nightshift.settings.serviceAccount.saveErrorToastTitle', {
          defaultMessage: 'Failed to change the investigation service account',
        }),
      });
    },
  });
};
