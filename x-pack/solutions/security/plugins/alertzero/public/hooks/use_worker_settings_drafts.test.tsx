/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { useWorkerSettingsDrafts } from './use_worker_settings_drafts';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const RULE_TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;

const createWorker = (overrides: Partial<Worker> = {}): Worker => ({
  id: TRIAGE,
  name: 'Alert Triage',
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: 1,
  allowedAutonomyLevels: ['manual', 'assisted', 'supervised'],
  settings: {
    workerId: TRIAGE,
    autonomy: 'manual',
  },
  ...overrides,
});

const triageWorker = createWorker();
const tuningWorker = createWorker({
  id: RULE_TUNING,
  name: 'Rule Tuning',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  settingsRevision: 4,
  settings: {
    workerId: RULE_TUNING,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 14 },
  },
});

const renderDrafts = (workers: Worker[]) =>
  renderHook(({ list }) => useWorkerSettingsDrafts(list), {
    initialProps: { list: workers },
  });

describe('useWorkerSettingsDrafts (Save/Discard draft — decisions doc items 1, 2, 10)', () => {
  it('seeds drafts from the loaded Workers and reports nothing dirty', () => {
    const { result } = renderDrafts([triageWorker, tuningWorker]);

    expect(result.current.getDraft(TRIAGE)).toEqual({
      enabled: false,
      settings: { autonomy: 'manual' },
    });
    expect(result.current.getDraft(RULE_TUNING)).toEqual({
      enabled: false,
      settings: { autonomy: 'manual', scheduleInterval: '2h', extras: { analysisWindowDays: 14 } },
    });
    expect(result.current.isDirty(TRIAGE)).toBe(false);
    expect(result.current.isDirty(RULE_TUNING)).toBe(false);
    expect(result.current.dirtyWorkerIds).toEqual([]);
    expect(result.current.buildSavePatch(TRIAGE)).toBeUndefined();
  });

  it('Save writes ONLY dirty Workers: buildSavePatch is undefined for untouched Workers', () => {
    const { result } = renderDrafts([triageWorker, tuningWorker]);

    act(() => {
      result.current.updateSettingsDraft(RULE_TUNING, { extras: { analysisWindowDays: 7 } });
    });

    expect(result.current.dirtyWorkerIds).toEqual([RULE_TUNING]);
    expect(result.current.buildSavePatch(TRIAGE)).toBeUndefined();
    expect(result.current.buildSavePatch(RULE_TUNING)).toEqual({
      settings: { extras: { analysisWindowDays: 7 } },
    });
  });

  it('an enabled-only draft produces an enabled-only patch (revision guard covers it server-side)', () => {
    const { result } = renderDrafts([triageWorker]);

    act(() => {
      result.current.updateEnabledDraft(TRIAGE, true);
    });

    expect(result.current.isDirty(TRIAGE)).toBe(true);
    expect(result.current.buildSavePatch(TRIAGE)).toEqual({ enabled: true });
  });

  it('Discard reverts unsaved edits and clears the dirty flag', () => {
    const { result } = renderDrafts([tuningWorker]);

    act(() => {
      result.current.updateSettingsDraft(RULE_TUNING, {
        autonomy: 'supervised',
        extras: { analysisWindowDays: 30 },
      });
      result.current.updateEnabledDraft(RULE_TUNING, true);
    });
    expect(result.current.isDirty(RULE_TUNING)).toBe(true);

    act(() => {
      result.current.discardDraft(RULE_TUNING);
    });

    expect(result.current.isDirty(RULE_TUNING)).toBe(false);
    expect(result.current.getDraft(RULE_TUNING)).toEqual({
      enabled: false,
      settings: { autonomy: 'manual', scheduleInterval: '2h', extras: { analysisWindowDays: 14 } },
    });
    expect(result.current.buildSavePatch(RULE_TUNING)).toBeUndefined();
  });

  it('partial failure: a Worker whose save did not land keeps its draft, the saved one goes clean', () => {
    // Simulates what watch_detail does after allSettled saves: the query refetches. The
    // successful Worker's server state now matches its draft (clean); the failed Worker's
    // server state is unchanged, so its draft stays dirty and visible for retry.
    const { result, rerender } = renderDrafts([triageWorker, tuningWorker]);

    act(() => {
      result.current.updateEnabledDraft(TRIAGE, true);
      result.current.updateSettingsDraft(RULE_TUNING, { extras: { analysisWindowDays: 7 } });
    });
    expect(result.current.dirtyWorkerIds.sort()).toEqual([RULE_TUNING, TRIAGE]);

    // RULE_TUNING save succeeded → refetch returns the persisted values.
    const savedTuning: Worker = {
      ...tuningWorker,
      settingsRevision: 5,
      settings: {
        workerId: RULE_TUNING,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 7 },
      },
    };
    rerender({ list: [triageWorker, savedTuning] });

    // Saved Worker is clean (draft matches refetched server state); failed Worker stays dirty.
    expect(result.current.isDirty(RULE_TUNING)).toBe(false);
    expect(result.current.isDirty(TRIAGE)).toBe(true);
    expect(result.current.buildSavePatch(TRIAGE)).toEqual({ enabled: true });
  });

  it('extras drafts replace whole-object (doc item 12), never deep-merge', () => {
    const { result } = renderDrafts([tuningWorker]);

    act(() => {
      result.current.updateSettingsDraft(RULE_TUNING, { extras: { analysisWindowDays: 3 } });
    });

    const patch = result.current.buildSavePatch(RULE_TUNING);
    expect(patch).toEqual({ settings: { extras: { analysisWindowDays: 3 } } });
  });

  it('reverts to baseline via resetDrafts after a partial save round', () => {
    const { result } = renderDrafts([triageWorker, tuningWorker]);

    act(() => {
      result.current.updateEnabledDraft(TRIAGE, true);
      result.current.updateSettingsDraft(RULE_TUNING, { autonomy: 'assisted' });
    });
    expect(result.current.dirtyWorkerIds).toHaveLength(2);

    act(() => {
      result.current.resetDrafts();
    });

    expect(result.current.dirtyWorkerIds).toEqual([]);
    expect(result.current.getDraft(TRIAGE).enabled).toBe(false);
    expect(result.current.getDraft(RULE_TUNING).settings.autonomy).toBe('manual');
  });
});
