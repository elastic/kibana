/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { UpdateWorkerRequestBody, Worker, WorkerSettingsWrite } from '@kbn/alertzero-common';

/** Draft of one Worker's editable state: the enabled toggle plus its settings. */
export interface WorkerSettingsDraft {
  enabled: boolean;
  settings: WorkerSettingsWrite;
}

const draftFromWorker = (worker: Worker): WorkerSettingsDraft => ({
  enabled: worker.enabled,
  settings: {
    autonomy: worker.settings.autonomy,
    ...(worker.settings.scheduleInterval == null
      ? {}
      : { scheduleInterval: worker.settings.scheduleInterval }),
    ...(worker.settings.extras == null ? {} : { extras: worker.settings.extras }),
  },
});

const settingsEqual = (a: WorkerSettingsWrite, b: WorkerSettingsWrite): boolean => {
  const aKeys = Object.keys(a) as (keyof WorkerSettingsWrite)[];
  const bKeys = Object.keys(b) as (keyof WorkerSettingsWrite)[];
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]));
};

/**
 * Draft state for the per-Worker settings panels (worker-settings-page-decisions-3, item 1:
 * nothing is written on change; Save persists, Discard reverts). Drafts are keyed by workerId
 * and initialized lazily from the loaded Worker list so a refetch does not clobber edits.
 */
export const useWorkerSettingsDrafts = (workers: Worker[]) => {
  const [drafts, setDrafts] = useState<Record<string, WorkerSettingsDraft>>({});
  const [revisions, setRevisions] = useState<Record<string, number | null>>({});
  const workersRef = useRef(workers);
  workersRef.current = workers;

  // Re-baseline drafts when the query returns data for workers we have not seen yet.
  const baseline = useMemo(() => {
    const next: Record<string, WorkerSettingsDraft> = {};
    const revs: Record<string, number | null> = {};
    for (const worker of workers) {
      next[worker.id] = draftFromWorker(worker);
      revs[worker.id] = worker.settingsRevision ?? null;
    }
    return { next, revs };
  }, [workers]);
  const baselinedFor = useRef<string>('');
  const baselineKey = workers.map((worker) => worker.id).join('|');
  if (baselineKey !== baselinedFor.current) {
    baselinedFor.current = baselineKey;
    // Preserve existing edits: only seed entries for new worker ids.
    setDrafts((current) => {
      const merged = { ...current };
      for (const [id, draft] of Object.entries(baseline.next)) {
        if (merged[id] == null) merged[id] = draft;
      }
      return merged;
    });
    setRevisions(baseline.revs);
  }

  const getDraft = useCallback(
    (workerId: string): WorkerSettingsDraft =>
      drafts[workerId] ?? baseline.next[workerId] ?? { enabled: false, settings: {} },
    [drafts, baseline]
  );

  const isDirty = useCallback(
    (workerId: string): boolean => {
      const worker = workersRef.current.find((candidate) => candidate.id === workerId);
      if (worker == null) return false;
      const draft = getDraft(workerId);
      return (
        draft.enabled !== worker.enabled ||
        !settingsEqual(draft.settings, draftFromWorker(worker).settings)
      );
    },
    [getDraft]
  );

  const dirtyWorkerIds = useMemo(
    () => workers.filter((worker) => isDirty(worker.id)).map((worker) => worker.id),
    [workers, isDirty]
  );

  const updateDraft = useCallback((workerId: string, next: WorkerSettingsDraft) => {
    setDrafts((current) => ({ ...current, [workerId]: next }));
  }, []);

  const updateSettingsDraft = useCallback((workerId: string, patch: WorkerSettingsWrite) => {
    setDrafts((current) => {
      const worker = workersRef.current.find((candidate) => candidate.id === workerId);
      const base = current[workerId] ?? (worker ? draftFromWorker(worker) : undefined);
      if (base == null) return current;
      const merged: WorkerSettingsWrite = {
        ...base.settings,
        ...patch,
        // extras replaces whole-object on write (doc item 12).
        ...(patch.extras == null ? {} : { extras: patch.extras }),
      };
      return { ...current, [workerId]: { enabled: base.enabled, settings: merged } };
    });
  }, []);

  const updateEnabledDraft = useCallback((workerId: string, enabled: boolean) => {
    setDrafts((current) => {
      const base = current[workerId];
      if (base == null) return current;
      return { ...current, [workerId]: { ...base, enabled } };
    });
  }, []);

  /** Reverts one Worker's draft to the last-saved state. */
  const discardDraft = useCallback((workerId: string) => {
    const worker = workersRef.current.find((candidate) => candidate.id === workerId);
    if (worker == null) return;
    setDrafts((current) => ({ ...current, [workerId]: draftFromWorker(worker) }));
  }, []);

  const resetDrafts = useCallback(() => {
    setDrafts(baseline.next);
    setRevisions(baseline.revs);
  }, [baseline]);

  const buildSavePatch = useCallback(
    (workerId: string): UpdateWorkerRequestBody | undefined => {
      if (!isDirty(workerId)) return undefined;
      const draft = getDraft(workerId);
      const worker = workersRef.current.find((candidate) => candidate.id === workerId);
      if (worker == null) return undefined;
      const patch: UpdateWorkerRequestBody = {};
      if (draft.enabled !== worker.enabled) patch.enabled = draft.enabled;
      const saved = draftFromWorker(worker).settings;
      if (!settingsEqual(draft.settings, saved)) {
        const settings: WorkerSettingsWrite = {};
        for (const key of Object.keys(draft.settings) as (keyof WorkerSettingsWrite)[]) {
          if (JSON.stringify(draft.settings[key]) !== JSON.stringify(saved[key])) {
            (settings as Record<string, unknown>)[key] = draft.settings[key];
          }
        }
        patch.settings = settings;
      }
      return patch.settings == null && patch.enabled === undefined ? undefined : patch;
    },
    [getDraft, isDirty]
  );

  return {
    getDraft,
    updateDraft,
    updateSettingsDraft,
    updateEnabledDraft,
    discardDraft,
    resetDrafts,
    isDirty,
    dirtyWorkerIds,
    buildSavePatch,
    revisions,
  };
};
