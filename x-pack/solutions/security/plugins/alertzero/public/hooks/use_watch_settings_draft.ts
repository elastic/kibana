/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type {
  UpdateWorkerRequestBody,
  Worker,
  WorkerSettings,
  WorkerSettingsWrite,
} from '@kbn/alertzero-common';
import {
  applyWorkerSettingsWrite,
  diffWorkerSettings,
  getCompleteWorkerSettingsSchema,
} from '@kbn/alertzero-common';
import { useUpdateWorker } from './use_workers_api';

interface WorkerDraftOverlay {
  enabled?: boolean;
  settings?: WorkerSettings;
  error?: string;
}

const isWorkerDirty = (worker: Worker, overlay: WorkerDraftOverlay | undefined): boolean => {
  if (!overlay) {
    return false;
  }
  const enabledDirty = overlay.enabled !== undefined && overlay.enabled !== worker.enabled;
  const settingsDirty =
    overlay.settings !== undefined && !isEqual(overlay.settings, worker.settings);
  return enabledDirty || settingsDirty;
};

/**
 * One draft per Watch page covering Enabled, the shared settings and each Worker's `extras`.
 * Nothing is written until Save; Save validates every dirty Worker against its complete schema,
 * then writes Worker by Worker so a failure keeps only that Worker's draft and error.
 */
export const useWatchSettingsDraft = (workers: Worker[]) => {
  const { mutateAsync } = useUpdateWorker();
  const [overlays, setOverlays] = useState<Record<string, WorkerDraftOverlay>>({});
  const [isSaving, setIsSaving] = useState(false);

  const resolve = useCallback(
    (worker: Worker) => {
      const overlay = overlays[worker.id];
      return {
        enabled: overlay?.enabled ?? worker.enabled,
        settings: overlay?.settings ?? worker.settings,
        error: overlay?.error,
        dirty: isWorkerDirty(worker, overlay),
      };
    },
    [overlays]
  );

  const dirtyWorkers = useMemo(
    () => workers.filter((worker) => isWorkerDirty(worker, overlays[worker.id])),
    [overlays, workers]
  );

  const isDirty = dirtyWorkers.length > 0;

  const updateEnabled = useCallback((worker: Worker, enabled: boolean) => {
    setOverlays((current) => ({
      ...current,
      [worker.id]: { ...current[worker.id], enabled, error: undefined },
    }));
  }, []);

  const updateSettings = useCallback((worker: Worker, patch: WorkerSettingsWrite) => {
    setOverlays((current) => ({
      ...current,
      [worker.id]: {
        ...current[worker.id],
        settings: applyWorkerSettingsWrite(current[worker.id]?.settings ?? worker.settings, patch),
        error: undefined,
      },
    }));
  }, []);

  const discard = useCallback(() => {
    setOverlays({});
  }, []);

  const save = useCallback(async (): Promise<void> => {
    const outstanding = workers.filter((worker) => isWorkerDirty(worker, overlays[worker.id]));
    if (outstanding.length === 0) {
      return;
    }

    const invalid = outstanding.some(
      (worker) =>
        !getCompleteWorkerSettingsSchema(worker.id).safeParse(resolve(worker).settings).success
    );
    if (invalid) {
      throw new Error('invalid');
    }

    setIsSaving(true);
    try {
      for (const worker of outstanding) {
        const draft = resolve(worker);
        const settings = diffWorkerSettings(worker.settings, draft.settings);
        const patch: UpdateWorkerRequestBody = {
          ...(draft.enabled !== worker.enabled ? { enabled: draft.enabled } : {}),
          ...(settings === undefined ? {} : { settings }),
        };

        try {
          await mutateAsync({ workerId: worker.id, patch });
          setOverlays((current) => {
            const { [worker.id]: _removed, ...rest } = current;
            return rest;
          });
        } catch (error) {
          setOverlays((current) => ({
            ...current,
            [worker.id]: {
              ...current[worker.id],
              error: error instanceof Error ? error.message : String(error),
            },
          }));
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [mutateAsync, overlays, resolve, workers]);

  return {
    discard,
    dirtyWorkers,
    isDirty,
    isSaving,
    resolve,
    save,
    updateEnabled,
    updateSettings,
  };
};
