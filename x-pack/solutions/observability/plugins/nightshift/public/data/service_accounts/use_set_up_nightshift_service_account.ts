/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { useMutation, useQueryClient, type UseMutationResult } from '@kbn/react-query';
import type { InvestigatorServiceAccountStatus } from '@kbn/nightshift-investigations-plugin/common';
import {
  ensureNightshiftServiceAccount,
  ensureNightshiftServiceAccounts,
  NightshiftServiceAccountSetupError,
} from '@kbn/nightshift-shared';
import { useKibana } from '../../hooks/use_kibana';
import {
  DETECTION_ENGINE_SERVICE_ACCOUNT_QUERY_KEY,
  NIGHTSHIFT_ONBOARDING_QUERY_KEY,
} from '../query_keys';
import { createBrowserServiceAccountsApi } from './browser_service_accounts_api';
import { INVESTIGATOR_SERVICE_ACCOUNT_QUERY_KEY } from './use_investigator_service_account';

/** Explains an account that cannot be used or created; other errors keep their own message. */
const toError = (error: unknown, { isServerless }: { isServerless: boolean }): Error => {
  if (error instanceof NightshiftServiceAccountSetupError) {
    const { name, role } = error.details;
    if (error.code === 'role_mismatch') {
      return new Error(
        i18n.translate('xpack.nightshift.serviceAccount.roleMismatchError', {
          defaultMessage:
            'The service account {name} exists, but does not hold the {role} role nightshift needs. Give it that role, or delete it and set nightshift up again.',
          values: { name, role },
        })
      );
    }
    if (error.code === 'account_unusable') {
      return new Error(
        i18n.translate('xpack.nightshift.serviceAccount.accountUnusableError', {
          defaultMessage:
            'The service account {name} exists, but Kibana cannot run as it. Delete it, then set nightshift up again.',
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
              'The role {role} that the service account {name} needs does not exist. Create the nightshift roles first (see the nightshift investigations README), then set nightshift up again.',
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
        'Nightshift is set up, but {listed}{remaining, plural, =0 {} one { and # more} other { and # more}} could not be moved to the nightshift automations account. Open each automation and save it, or enable nightshift again.',
      values: { listed, remaining: Math.max(remaining, 0) },
    }),
  });
};

/**
 * Enables Nightshift in the current space, in one step: finds the deployment's Nightshift service
 * accounts by name, or creates them, as the current user, binds the space's workflows to them,
 * sets the detection engine up on its own account first, then installs the investigation agent. Every step is idempotent, so a retry after a partial
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
    significantEvents,
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
      const accountsApi = createBrowserServiceAccountsApi({
        http,
        serviceAccounts: security.serviceAccounts,
      });
      const serviceAccountIds = await ensureNightshiftServiceAccounts(accountsApi, {
        isServerless,
      });
      // The detection engine account is global like the other two, so a second space reuses it.
      // It is bound before the investigation entry point: once that is bound the status reads as
      // set up and hides the prompt, so a failure after it would leave no way to retry.
      const detectionServiceAccountId = await ensureNightshiftServiceAccount(accountsApi, {
        kind: 'detection',
        isServerless,
      });
      await significantEvents.significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/service_account/_enable',
        {
          signal: null,
          params: { body: { serviceAccountId: detectionServiceAccountId } },
        }
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
      queryClient.setQueryData(INVESTIGATOR_SERVICE_ACCOUNT_QUERY_KEY, status);
      queryClient.invalidateQueries({ queryKey: DETECTION_ENGINE_SERVICE_ACCOUNT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY });
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.serviceAccount.enabledToastTitle', {
          defaultMessage: 'Elastic nightshift enabled',
        }),
      });
      warnAboutUnboundAutomations(status, notifications);
    },
    onError: (error) => {
      // A failed setup may have done part of its work; read the status again.
      queryClient.invalidateQueries({ queryKey: INVESTIGATOR_SERVICE_ACCOUNT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETECTION_ENGINE_SERVICE_ACCOUNT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY });
      notifications.toasts.addError(toError(error, { isServerless }), {
        title: i18n.translate('xpack.nightshift.serviceAccount.setupErrorToastTitle', {
          defaultMessage: 'Could not enable Elastic nightshift',
        }),
      });
    },
  });
};
