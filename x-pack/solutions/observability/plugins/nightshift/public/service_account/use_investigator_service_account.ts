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
import {
  ensureNightshiftServiceAccounts,
  NightshiftServiceAccountSetupError,
  type InvestigatorServiceAccountStatus,
} from '@kbn/nightshift-investigations-plugin/common';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';
import { createBrowserServiceAccountsApi } from './browser_service_accounts_api';

const QUERY_KEY = ['nightshift.investigatorServiceAccount'] as const;

/** Explains an account that cannot be used or created; other errors keep their own message. */
const toError = (error: unknown, { isServerless }: { isServerless: boolean }): Error => {
  if (error instanceof NightshiftServiceAccountSetupError) {
    const { name, role } = error.details;
    if (error.code === 'account_unusable') {
      return new Error(
        i18n.translate('xpack.nightshift.serviceAccount.accountUnusableError', {
          defaultMessage:
            'The service account {name} exists, but Kibana cannot run as it. Delete it, then set Nightshift up again.',
          values: { name },
        })
      );
    }
    return new Error(
      isServerless
        ? i18n.translate('xpack.nightshift.serviceAccount.predefinedRoleMissingError', {
            defaultMessage:
              'This project does not have the predefined role {role} that the service account {name} needs.',
            values: { name, role },
          })
        : i18n.translate('xpack.nightshift.serviceAccount.roleMissingError', {
            defaultMessage:
              'The role {role} that the service account {name} needs does not exist. Create the Nightshift roles first (see the Nightshift investigations README), then set Nightshift up again.',
            values: { name, role },
          })
    );
  }
  return error instanceof Error ? error : new Error(String(error));
};

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

/**
 * Sets up Nightshift in the current space: finds the deployment's Nightshift service accounts by
 * name, or creates them, as the current user, then binds the space's workflows to them.
 */
export const useSetUpNightshiftServiceAccount = (): UseMutationResult<
  InvestigatorServiceAccountStatus,
  unknown,
  void
> => {
  const {
    notifications,
    nightshiftInvestigations,
    http,
    security,
    isServerless = false,
  } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<InvestigatorServiceAccountStatus, unknown, void>({
    mutationFn: async () => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const serviceAccountIds = await ensureNightshiftServiceAccounts(
        createBrowserServiceAccountsApi({ http, serviceAccounts: security.serviceAccounts }),
        { isServerless }
      );
      return investigationsClient.fetch(
        'POST /internal/nightshift/investigations/service_account/_enable',
        { signal: null, params: { body: { serviceAccountIds } } }
      );
    },
    onSuccess: (status) => {
      queryClient.setQueryData(QUERY_KEY, status);
    },
    onError: (error) => {
      // A failed setup may have done part of its work; read the status again.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      notifications.toasts.addError(toError(error, { isServerless }), {
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
