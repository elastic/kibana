/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { ListWorkersResponse } from '@kbn/alertzero-common';
import { useUpdateWorker } from '../../hooks/use_workers_api';
import { queryKeys } from '../../query_keys';

type WorkerEnabledMap = Record<string, boolean>;

export const useEnableWorkers = (
  workerIds: readonly string[],
  workerEnabled: WorkerEnabledMap,
  onSuccess?: () => void
) => {
  const queryClient = useQueryClient();
  const { mutateAsync: updateWorker } = useUpdateWorker();
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
    try {
      await Promise.all(
        idsToUpdate.map((id) =>
          updateWorker({ workerId: id, patch: { enabled: workerEnabled[id] } })
        )
      );
    } catch {
      // errors surfaced via toast in useUpdateWorker.onError
      return;
    } finally {
      setIsSaving(false);
    }
    onSuccess?.();
  };

  return { handleEnableAndContinue, isSaving };
};
