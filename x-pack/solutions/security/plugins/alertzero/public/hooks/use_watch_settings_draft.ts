/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  UpdateWorkerRequestBody,
  Worker,
  WorkerSettings,
  WorkerSettingsWrite,
  WatchAutonomyLevel,
} from '@kbn/alertzero-common';
import { parseCompleteWorkerSettings } from '@kbn/alertzero-common';
import { useUpdateWorker } from './use_workers_api';

interface WorkerDraftOverlay {
  enabled?: boolean;
  settings?: WorkerSettings;
  error?: string;
}

const settingsEqual = (left: WorkerSettings, right: WorkerSettings): boolean =>
  left.autonomy === right.autonomy &&
  left.scheduleInterval === right.scheduleInterval &&
  left.analysisWindowDays === right.analysisWindowDays;

const diffSettings = (
  saved: WorkerSettings,
  draft: WorkerSettings
): WorkerSettingsWrite | undefined => {
  const patch: WorkerSettingsWrite = {
    ...(draft.autonomy !== saved.autonomy ? { autonomy: draft.autonomy } : {}),
    ...(draft.scheduleInterval !== saved.scheduleInterval && draft.scheduleInterval != null
      ? { scheduleInterval: draft.scheduleInterval }
      : {}),
    ...(draft.analysisWindowDays !== saved.analysisWindowDays && draft.analysisWindowDays != null
      ? { analysisWindowDays: draft.analysisWindowDays }
      : {}),
  };
  return Object.keys(patch).length > 0 ? patch : undefined;
};

const isWorkerDirty = (worker: Worker, overlay: WorkerDraftOverlay | undefined): boolean => {
  if (!overlay) {
    return false;
  }
  const enabledDirty = overlay.enabled !== undefined && overlay.enabled !== worker.enabled;
  const settingsDirty =
    overlay.settings !== undefined && !settingsEqual(overlay.settings, worker.settings);
  return enabledDirty || settingsDirty;
};

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
    setOverlays((current) => {
      const previous = current[worker.id]?.settings ?? worker.settings;
      return {
        ...current,
        [worker.id]: {
          ...current[worker.id],
          settings: {
            ...previous,
            ...(patch.autonomy === undefined
              ? {}
              : { autonomy: patch.autonomy as WatchAutonomyLevel }),
            ...(patch.scheduleInterval === undefined
              ? {}
              : { scheduleInterval: patch.scheduleInterval }),
            ...(patch.analysisWindowDays === undefined
              ? {}
              : { analysisWindowDays: patch.analysisWindowDays }),
          },
          error: undefined,
        },
      };
    });
  }, []);

  const discard = useCallback(() => {
    setOverlays({});
  }, []);

  const save = useCallback(async (): Promise<void> => {
    const outstanding = workers.filter((worker) => isWorkerDirty(worker, overlays[worker.id]));
    if (outstanding.length === 0) {
      return;
    }

    const invalid = outstanding.some((worker) => {
      try {
        parseCompleteWorkerSettings(resolve(worker).settings);
        return false;
      } catch {
        return true;
      }
    });
    if (invalid) {
      throw new Error('invalid');
    }

    setIsSaving(true);
    try {
      for (const worker of outstanding) {
        const draft = resolve(worker);
        const settings = diffSettings(worker.settings, draft.settings);
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
