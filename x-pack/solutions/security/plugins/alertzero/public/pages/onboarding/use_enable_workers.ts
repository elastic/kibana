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
import { API_VERSIONS, buildWorkerUrl } from '@kbn/alertzero-common';
import type { ListWorkersResponse } from '@kbn/alertzero-common';
import { notifyWorkerUpdateError } from '../../hooks/use_workers_api';
import { queryKeys } from '../../query_keys';

type WorkerEnabledMap = Record<string, boolean>;

export const useEnableWorkers = (
  workerIds: readonly string[],
  workerEnabled: WorkerEnabledMap,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { services } = useKibana<CoreStart>();
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
    // Direct http.patch calls instead of useUpdateWorker so no replaceWorkerInList
    // fires per-PATCH. LandingPage's showQueue guard must only react to real server
    // state changes (background refetches), not optimistic per-PATCH cache writes
    // that would prematurely unmount OnboardingPage before all PATCHes settle.
    // allSettled keeps isSaving true for the full fan-out so a single rejection does
    // not re-enable the button while the remaining PATCHes are still in-flight.
    const results = await Promise.allSettled(
      idsToUpdate.map((id) =>
        services.http!.patch(buildWorkerUrl(id), {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ enabled: workerEnabled[id] }),
        })
      )
    );
    setIsSaving(false);

    let hadFailure = false;
    results.forEach((result) => {
      if (result.status === 'rejected') {
        hadFailure = true;
        notifyWorkerUpdateError(services.notifications!.toasts, result.reason);
      }
    });
    if (hadFailure) return;
    // Invalidate the workers cache so the Watches page doesn't briefly render
    // stale (disabled) worker state after navigating away. Not awaited — the
    // refetch runs in the background while the navigation is processed.
    queryClient.invalidateQueries({ queryKey: queryKeys.workers.list() });
    onSuccess?.();
  };

  return { handleEnableAndContinue, isSaving };
};
