/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { useWatchSettingsDraft } from './use_watch_settings_draft';
import { useUpdateWorker } from './use_workers_api';

jest.mock('./use_workers_api');

const mockUseUpdateWorker = jest.mocked(useUpdateWorker);

const createWorker = (overrides: Partial<Worker> & Pick<Worker, 'id' | 'name'>): Worker => ({
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: 1,
  workflowId: null,
  settings: {
    workerId: overrides.id,
    autonomy: 'manual',
  },
  ...overrides,
});

const ruleTuning = createWorker({
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  name: 'Rule Tuning',
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 14 },
  },
});

const ruleCreation = createWorker({
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  name: 'Rule Creation',
});

describe('useWatchSettingsDraft', () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateWorker.mockReturnValue({ mutateAsync } as never);
  });

  it('does not write on edit and discards unsaved drafts', () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCreation]));

    act(() => {
      result.current.updateEnabled(ruleTuning, true);
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.resolve(ruleTuning)).toMatchObject({
      enabled: true,
      settings: { extras: { analysisWindowDays: 7 } },
      dirty: true,
    });
    expect(mutateAsync).not.toHaveBeenCalled();

    act(() => {
      result.current.discard();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.resolve(ruleTuning)).toMatchObject({
      enabled: false,
      settings: { extras: { analysisWindowDays: 14 } },
      dirty: false,
    });
  });

  it('diffs and revision-checks against the settings the edit started from, not a later refetch', async () => {
    mutateAsync.mockResolvedValue({ worker: ruleTuning });
    const { result, rerender } = renderHook(
      ({ workers }: { workers: Worker[] }) => useWatchSettingsDraft(workers),
      { initialProps: { workers: [ruleTuning] } }
    );

    act(() => {
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
    });

    // Someone else saved a new interval while this draft was open.
    const refreshed: Worker = {
      ...ruleTuning,
      settingsRevision: 2,
      settings: { ...ruleTuning.settings, scheduleInterval: '6h' },
    };
    rerender({ workers: [refreshed] });

    expect(result.current.resolve(refreshed).dirty).toBe(true);
    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: 1 },
    });
  });

  it('keeps the draft and its baseline when the server refuses a stale save', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('conflict'));
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning]));

    act(() => {
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.resolve(ruleTuning)).toMatchObject({
      dirty: true,
      error: 'conflict',
      settings: { extras: { analysisWindowDays: 7 } },
    });

    // A retry still carries the original revision; nothing is silently re-based.
    mutateAsync.mockRejectedValueOnce(new Error('conflict'));
    await act(async () => {
      await result.current.save();
    });
    expect(mutateAsync).toHaveBeenLastCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: 1 },
    });
  });

  it('sends a null revision for a Worker that has not been installed yet', async () => {
    const uninstalled: Worker = { ...ruleCreation, settingsRevision: null };
    mutateAsync.mockResolvedValue({ worker: uninstalled });
    const { result } = renderHook(() => useWatchSettingsDraft([uninstalled]));

    act(() => {
      result.current.updateSettings(uninstalled, { autonomy: 'assisted' });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
      patch: { settings: { autonomy: 'assisted' }, settingsRevision: null },
    });
  });

  it('treats extras set back to the saved value as clean', () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning]));

    act(() => {
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 14 } });
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('refuses to save while any dirty draft fails its complete schema', async () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCreation]));

    act(() => {
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 31 } });
      result.current.updateEnabled(ruleCreation, true);
    });

    await expect(result.current.save()).rejects.toThrow('invalid');
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
  });

  describe('partial success', () => {
    /** What the server persists for Rule Tuning; what the refreshed Worker list then carries. */
    const persistedRuleTuning: Worker = {
      ...ruleTuning,
      settingsRevision: 2,
      settings: { ...ruleTuning.settings, extras: { analysisWindowDays: 7 } },
    };
    const SAVE_FAILURE = 'Worker settings are temporarily unavailable; try again';

    /**
     * Edits two Workers, saves once so Rule Tuning succeeds and Rule Creation fails, then hands
     * the hook the refreshed list the page would receive after the successful write.
     */
    const saveWithOneFailure = async () => {
      mutateAsync
        .mockResolvedValueOnce({ worker: persistedRuleTuning })
        .mockRejectedValueOnce(new Error(SAVE_FAILURE));
      const rendered = renderHook(
        ({ workers }: { workers: Worker[] }) => useWatchSettingsDraft(workers),
        { initialProps: { workers: [ruleTuning, ruleCreation] } }
      );

      act(() => {
        rendered.result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
        rendered.result.current.updateEnabled(ruleCreation, true);
      });
      await act(async () => {
        await rendered.result.current.save();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(2);
      expect(mutateAsync).toHaveBeenNthCalledWith(1, {
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        patch: { settings: { extras: { analysisWindowDays: 7 } }, settingsRevision: 1 },
      });
      expect(mutateAsync).toHaveBeenNthCalledWith(2, {
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
        patch: { enabled: true },
      });

      rendered.rerender({ workers: [persistedRuleTuning, ruleCreation] });
      return rendered;
    };

    it('shows the saved value for the Worker that succeeded and retries only the one that failed', async () => {
      const { result, rerender } = await saveWithOneFailure();

      expect(result.current.resolve(persistedRuleTuning)).toMatchObject({
        settings: { extras: { analysisWindowDays: 7 } },
        dirty: false,
        error: undefined,
      });
      expect(result.current.resolve(ruleCreation)).toMatchObject({
        enabled: true,
        dirty: true,
        error: SAVE_FAILURE,
      });
      expect(result.current.dirtyWorkers.map(({ id }) => id)).toEqual([ruleCreation.id]);

      const persistedRuleCreation: Worker = { ...ruleCreation, enabled: true };
      mutateAsync.mockResolvedValueOnce({ worker: persistedRuleCreation });
      await act(async () => {
        await result.current.save();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(3);
      expect(mutateAsync).toHaveBeenLastCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
        patch: { enabled: true },
      });

      rerender({ workers: [persistedRuleTuning, persistedRuleCreation] });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.resolve(persistedRuleCreation)).toMatchObject({
        enabled: true,
        dirty: false,
        error: undefined,
      });
    });

    it("discards the failed Worker's edits without undoing the successful write", async () => {
      const { result } = await saveWithOneFailure();

      act(() => {
        result.current.discard();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.resolve(ruleCreation)).toMatchObject({
        enabled: false,
        dirty: false,
        error: undefined,
      });
      expect(result.current.resolve(persistedRuleTuning).settings.extras).toEqual({
        analysisWindowDays: 7,
      });
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });
  });
});
