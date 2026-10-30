/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
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
import { NIGHTSHIFT_ONBOARDING_QUERY_KEY } from '../onboarding/use_onboarding';
import { createBrowserServiceAccountsApi } from './browser_service_accounts_api';

const QUERY_KEY = ['nightshift.investigatorServiceAccount'] as const;

/** Explains an account that cannot be used or created; other errors keep their own message. */
const toError = (error: unknown, { isServerless }: { isServerless: boolean }): Error => {
  if (error instanceof NightshiftServiceAccountSetupError) {
    const { name, role } = error.details;
    if (error.code === 'role_mismatch') {
      return new Error(
        i18n.translate('xpack.nightshift.serviceAccount.roleMismatchError', {
          defaultMessage:
            'The service account {name} exists, but does not hold the {role} role Nightshift needs. Give it that role, or delete it and set Nightshift up again.',
          values: { name, role },
        })
      );
    }
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

/** How many unbound automations the warning names before it counts the rest. */
const MAX_LISTED_UNBOUND_AUTOMATIONS = 3;

/**
 * Warns about automations the setup could not bind. They keep running as the user who created
 * them, so they stop working once that user loses access, and an admin has to save them again.
 */
const warnAboutUnboundAutomations = (
  { unboundAutomations }: InvestigatorServiceAccountStatus,
  notifications: NotificationsStart
): void => {
  if (!unboundAutomations?.length) {
    return;
  }
  const listed = unboundAutomations
    .slice(0, MAX_LISTED_UNBOUND_AUTOMATIONS)
    .map(({ name, id }) => name || id)
    .join(', ');
  const remaining = unboundAutomations.length - MAX_LISTED_UNBOUND_AUTOMATIONS;
  notifications.toasts.addWarning({
    title: i18n.translate('xpack.nightshift.serviceAccount.unboundAutomationsToastTitle', {
      defaultMessage:
        '{count, plural, one {# automation still runs as its author} other {# automations still run as their authors}}',
      values: { count: unboundAutomations.length },
    }),
    text: i18n.translate('xpack.nightshift.serviceAccount.unboundAutomationsToastText', {
      defaultMessage:
        'Nightshift is set up, but {listed}{remaining, plural, =0 {} one { and # more} other { and # more}} could not be moved to the Nightshift automations account. Open each automation and save it, or enable Nightshift again.',
      values: { listed, remaining: Math.max(remaining, 0) },
    }),
  });
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
 * Enables Nightshift in the current space, in one step: finds the deployment's Nightshift service
 * accounts by name, or creates them, as the current user, binds the space's workflows to them,
 * then installs the investigation agent. Both halves are idempotent, so a retry after a partial
 * failure completes the setup.
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
      const status = await investigationsClient.fetch(
        'POST /internal/nightshift/investigations/service_account/_enable',
        { signal: null, params: { body: { serviceAccountIds } } }
      );
      // The space's agent runs as the account the step above bound, so it is installed last.
      await investigationsClient.fetch('POST /internal/nightshift/onboarding/enable', {
        signal: null,
      });
      return status;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(QUERY_KEY, status);
      queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY });
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.serviceAccount.enabledToastTitle', {
          defaultMessage: 'Elastic Nightshift enabled',
        }),
      });
      warnAboutUnboundAutomations(status, notifications);
    },
    onError: (error) => {
      // A failed setup may have done part of its work; read the status again.
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY });
      notifications.toasts.addError(toError(error, { isServerless }), {
        title: i18n.translate('xpack.nightshift.serviceAccount.setupErrorToastTitle', {
          defaultMessage: 'Could not enable Elastic Nightshift',
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
