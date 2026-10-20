/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS, buildWorkerUrl } from '@kbn/alertzero-common';
import type { ListWorkersResponse } from '@kbn/alertzero-common';
import { notifyWorkerUpdateError } from '../../hooks/use_workers_api';
import { queryKeys } from '../../query_keys';
import {
  ensureWorkerServiceAccounts,
  type CoreServiceAccounts,
} from '../../service_accounts/ensure_worker_service_accounts';
import { workerName } from '../watches/workers/translations';
import * as onboardingI18n from './translations';

const PARTIAL_SUCCESS_WARNING = i18n.translate('xpack.alertzero.onboarding.partialSuccessWarning', {
  defaultMessage:
    'Some settings were saved before the error. Check Watches to review the current status.',
});

type WorkerEnabledMap = Record<string, boolean>;

export const useEnableWorkers = (
  workerIds: readonly string[],
  workerEnabled: WorkerEnabledMap,
  onSuccess?: () => void,
  onSavingChange?: (saving: boolean) => void
) => {
  const queryClient = useQueryClient();
  const { services } = useKibana<
    CoreStart & { serviceAccounts?: CoreServiceAccounts; isServerless?: boolean }
  >();
  const [isSaving, setIsSaving] = useState(false);

  const handleEnableAndContinue = async () => {
    // Filter against the cached workers list so skill-gated workers absent from
    // the server response are not sent a PATCH that would return 404.
    const cached = queryClient.getQueryData<ListWorkersResponse>(queryKeys.workers.list());
    if (!cached) {
      // Cache miss: we cannot safely determine which workers exist server-side.
      // Bail out rather than blindly PATCHing all IDs and hitting 404s.
      return;
    }
    const visibleIds = new Set(cached.workers.map((w) => w.id));
    const idsToUpdate = workerIds.filter((id) => visibleIds.has(id));

    setIsSaving(true);
    onSavingChange?.(true);
    // Workers being turned on without a service account get their prebuilt one first. A Worker
    // whose account cannot be set up stays off; pressing the button again retries it.
    const workerById = new Map(cached.workers.map((worker) => [worker.id, worker]));
    const needsAccount = idsToUpdate.filter(
      (id) => workerEnabled[id] === true && !workerById.get(id)?.settings?.serviceAccountId
    );
    const accounts = await ensureWorkerServiceAccounts(
      services.http!,
      services.serviceAccounts,
      needsAccount,
      { isServerless: services.isServerless ?? false }
    );
    const accountFailures = needsAccount.flatMap((id) => {
      const account = accounts.get(id);
      return account && !account.ok
        ? [{ name: workerName(id, workerById.get(id)?.name), error: account.error }]
        : [];
    });
    const idsToPatch = idsToUpdate.filter((id) => accounts.get(id)?.ok !== false);

    // Direct http.patch calls instead of useUpdateWorker so no replaceWorkerInList
    // fires per-PATCH. LandingPage's showQueue guard must only react to real server
    // state changes (background refetches), not optimistic per-PATCH cache writes
    // that would prematurely unmount OnboardingPage before all PATCHes settle.
    // allSettled keeps isSaving true for the full fan-out so a single rejection does
    // not re-enable the button while the remaining PATCHes are still in-flight.
    const results = await Promise.allSettled(
      idsToPatch.map((id) => {
        const turningOn = workerEnabled[id] === true;
        const account = accounts.get(id);
        // An existing binding is kept; only a newly set up account is written.
        const body =
          turningOn && account?.ok
            ? {
                enabled: true,
                settings: { serviceAccountId: account.serviceAccountId },
                settingsRevision: workerById.get(id)?.settingsRevision ?? null,
              }
            : { enabled: turningOn };
        return services.http!.patch(buildWorkerUrl(id), {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify(body),
        });
      })
    );

    if (accountFailures.length > 0) {
      services.notifications!.toasts.addDanger({
        title: onboardingI18n.SERVICE_ACCOUNT_SETUP_FAILED_TITLE,
        text: onboardingI18n.serviceAccountSetupFailedText(
          accountFailures.map(({ name, error }) => `${name}: ${error}`).join('; ')
        ),
      });
    }

    let hadFailure = accountFailures.length > 0;
    let hadSuccess = false;
    results.forEach((result) => {
      if (result.status === 'rejected') {
        hadFailure = true;
        notifyWorkerUpdateError(services.notifications!.toasts, result.reason);
      } else {
        hadSuccess = true;
      }
    });

    if (hadFailure && hadSuccess) {
      // A successful enable writes settings and bumps settingsRevision. Refresh before the
      // button can be pressed again, or the retry resends the revision from before this save
      // and the workers that landed come back as conflicts. This stays after the fan-out:
      // per-patch cache writes would let LandingPage leave onboarding early.
      await queryClient.invalidateQueries({ queryKey: queryKeys.workers.list() });
    }

    setIsSaving(false);

    if (hadFailure) {
      if (hadSuccess) {
        // Partial success: keep savingInProgress=true in LandingPage so a background
        // workers refetch with partially-committed state cannot transition to
        // ConversationsPage before the user has had a chance to retry or leave.
        services.notifications!.toasts.addWarning(PARTIAL_SUCCESS_WARNING);
      } else {
        // Total failure: nothing was committed server-side, so it is safe to release
        // the save lock and let a subsequent worker enable transition normally.
        onSavingChange?.(false);
      }
      return;
    }

    // Full success: release the save lock, invalidate the cache, and navigate.
    // Invalidate first so the Watches page gets fresh state on mount.
    queryClient.invalidateQueries({ queryKey: queryKeys.workers.list() });
    onSavingChange?.(false);
    onSuccess?.();
  };

  return { handleEnableAndContinue, isSaving };
};
