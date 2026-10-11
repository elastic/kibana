/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  RULE_COVERAGE_DEFAULT_EXTRAS,
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { ensureWorkerServiceAccounts } from '../service_accounts/ensure_worker_service_accounts';
import { useWatchSettingsDraft } from './use_watch_settings_draft';
import { useUpdateWorker } from './use_workers_api';

jest.mock('./use_workers_api');
jest.mock('../service_accounts/ensure_worker_service_accounts');

const mockUseUpdateWorker = jest.mocked(useUpdateWorker);
const mockEnsureWorkerServiceAccounts = jest.mocked(ensureWorkerServiceAccounts);

const createWorker = (overrides: Partial<Worker> & Pick<Worker, 'id' | 'name'>): Worker => ({
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: 1,
  workflowId: null,
  blockingReasons: [],
  settings: {
    workerId: overrides.id,
    autonomy: 'manual',
  },
  ...overrides,
});

/** Complete Rule Tuning extras; cases vary the window and keep the FP thresholds at default. */
const RULE_TUNING_EXTRAS = { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 14 };

const ruleTuning = createWorker({
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  name: 'Rule Tuning',
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: RULE_TUNING_EXTRAS,
    serviceAccountId: 'kibana/alertzero_rule_tuning',
  },
});

const ruleCoverage = createWorker({
  id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  name: 'Rule Coverage',
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
    autonomy: 'manual',
    scheduleInterval: '1h',
    extras: RULE_COVERAGE_DEFAULT_EXTRAS,
    serviceAccountId: 'kibana/alertzero_rule_coverage',
  },
});

const { serviceAccountId: _coverageAccount, ...coverageSettingsWithoutAccount } =
  ruleCoverage.settings;
/** A Worker that has never been bound to a service account. */
const unboundRuleCoverage: Worker = { ...ruleCoverage, settings: coverageSettingsWithoutAccount };

describe('useWatchSettingsDraft', () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpdateWorker.mockReturnValue({ mutateAsync } as never);
    mockEnsureWorkerServiceAccounts.mockImplementation(
      async (_http, _serviceAccounts, workerIds) =>
        new Map(
          workerIds.map((id) => [id, { ok: true as const, serviceAccountId: `kibana/sa-${id}` }])
        )
    );
  });

  describe('prebuilt service account', () => {
    it('binds the prebuilt account when a Worker without one is turned on', async () => {
      mutateAsync.mockResolvedValue({ worker: unboundRuleCoverage });
      const { result } = renderHook(() => useWatchSettingsDraft([unboundRuleCoverage]));

      act(() => {
        result.current.updateEnabled(unboundRuleCoverage, true);
      });
      await act(async () => {
        await result.current.save();
      });

      expect(mockEnsureWorkerServiceAccounts).toHaveBeenCalledWith(
        undefined,
        undefined,
        [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID],
        { isServerless: false }
      );
      expect(mutateAsync).toHaveBeenCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        patch: {
          enabled: true,
          settings: {
            serviceAccountId: `kibana/sa-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID}`,
          },
          settingsRevision: 1,
        },
      });
    });

    it('binds it alongside settings edits, against the revision the edit started from', async () => {
      mutateAsync.mockResolvedValue({ worker: unboundRuleCoverage });
      const { result } = renderHook(() => useWatchSettingsDraft([unboundRuleCoverage]));

      act(() => {
        result.current.updateEnabled(unboundRuleCoverage, true);
        result.current.updateSettings(unboundRuleCoverage, { autonomy: 'assisted' });
      });
      await act(async () => {
        await result.current.save();
      });

      expect(mutateAsync).toHaveBeenCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        patch: {
          enabled: true,
          settings: {
            autonomy: 'assisted',
            serviceAccountId: `kibana/sa-${SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID}`,
          },
          settingsRevision: 1,
        },
      });
    });

    it('keeps the Worker off with an error when its account cannot be set up', async () => {
      mockEnsureWorkerServiceAccounts.mockResolvedValueOnce(
        new Map([
          [
            SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
            { ok: false as const, error: 'Forbidden' },
          ],
        ])
      );
      const { result } = renderHook(() => useWatchSettingsDraft([unboundRuleCoverage]));

      act(() => {
        result.current.updateEnabled(unboundRuleCoverage, true);
      });
      let savedWorkers: Worker[] = [];
      await act(async () => {
        savedWorkers = await result.current.save();
      });

      expect(savedWorkers).toEqual([]);
      expect(mutateAsync).not.toHaveBeenCalled();
      expect(result.current.resolve(unboundRuleCoverage)).toMatchObject({
        enabled: true,
        dirty: true,
        error: 'Forbidden',
      });
    });

    it('does not set up an account for a Worker that keeps its binding or is turned off', async () => {
      const enabledUnbound: Worker = { ...unboundRuleCoverage, enabled: true };
      mutateAsync.mockResolvedValue({ worker: ruleTuning });
      const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, enabledUnbound]));

      act(() => {
        result.current.updateEnabled(ruleTuning, true);
        result.current.updateEnabled(enabledUnbound, false);
      });
      await act(async () => {
        await result.current.save();
      });

      expect(mockEnsureWorkerServiceAccounts).toHaveBeenCalledWith(undefined, undefined, [], {
        isServerless: false,
      });
      expect(mutateAsync).toHaveBeenCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        patch: { enabled: true },
      });
      expect(mutateAsync).toHaveBeenCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        patch: { enabled: false },
      });
    });
  });

  it('does not write on edit and discards unsaved drafts', () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCoverage]));

    act(() => {
      result.current.updateEnabled(ruleTuning, true);
      result.current.updateSettings(ruleTuning, {
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
      });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.resolve(ruleTuning)).toMatchObject({
      enabled: true,
      settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
      dirty: true,
    });
    expect(mutateAsync).not.toHaveBeenCalled();

    act(() => {
      result.current.discard();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.resolve(ruleTuning)).toMatchObject({
      enabled: false,
      settings: { extras: RULE_TUNING_EXTRAS },
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
      result.current.updateSettings(ruleTuning, {
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
      });
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
      patch: {
        settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
        settingsRevision: 1,
      },
    });
  });

  it('keeps the draft and its baseline when the server refuses a stale save', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('conflict'));
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning]));

    act(() => {
      result.current.updateSettings(ruleTuning, {
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
      });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.resolve(ruleTuning)).toMatchObject({
      dirty: true,
      error: 'conflict',
      settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
    });

    // A retry still carries the original revision; nothing is silently re-based.
    mutateAsync.mockRejectedValueOnce(new Error('conflict'));
    await act(async () => {
      await result.current.save();
    });
    expect(mutateAsync).toHaveBeenLastCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: {
        settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
        settingsRevision: 1,
      },
    });
  });

  it('resolves with only the Workers that were written, as the server returned them', async () => {
    const written: Worker = { ...ruleCoverage, enabled: true, blockingReasons: ['no_model'] };
    mutateAsync
      .mockRejectedValueOnce(new Error('patch failed'))
      .mockResolvedValueOnce({ worker: written });
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCoverage]));

    act(() => {
      result.current.updateEnabled(ruleTuning, true);
      result.current.updateEnabled(ruleCoverage, true);
    });
    let savedWorkers: Worker[] = [];
    await act(async () => {
      savedWorkers = await result.current.save();
    });

    expect(savedWorkers).toEqual([written]);
  });

  it('drops a pending switch-on once the Worker can no longer be switched on', async () => {
    const { result, rerender } = renderHook(
      ({ workers }: { workers: Worker[] }) => useWatchSettingsDraft(workers),
      { initialProps: { workers: [ruleTuning] } }
    );

    act(() => {
      result.current.updateEnabled(ruleTuning, true);
    });
    expect(result.current.isDirty).toBe(true);

    const blocked: Worker = { ...ruleTuning, blockingReasons: ['no_model'] };
    rerender({ workers: [blocked] });

    expect(result.current.resolve(blocked)).toMatchObject({ enabled: false, dirty: false });
    expect(result.current.isDirty).toBe(false);

    rerender({ workers: [ruleTuning] });

    expect(result.current.resolve(ruleTuning)).toMatchObject({ enabled: false, dirty: false });
    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends a null revision for a Worker that has not been installed yet', async () => {
    const uninstalled: Worker = { ...ruleCoverage, settingsRevision: null };
    mutateAsync.mockResolvedValue({ worker: uninstalled });
    const { result } = renderHook(() => useWatchSettingsDraft([uninstalled]));

    act(() => {
      result.current.updateSettings(uninstalled, { autonomy: 'assisted' });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
      patch: { settings: { autonomy: 'assisted' }, settingsRevision: null },
    });
  });

  it('treats extras set back to the saved value as clean', () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning]));

    act(() => {
      result.current.updateSettings(ruleTuning, {
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
      });
      result.current.updateSettings(ruleTuning, {
        extras: RULE_TUNING_EXTRAS,
      });
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('refuses to save while any dirty draft fails its complete schema', async () => {
    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCoverage]));

    act(() => {
      result.current.updateSettings(ruleTuning, {
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 31 },
      });
      result.current.updateEnabled(ruleCoverage, true);
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
      settings: {
        ...ruleTuning.settings,
        extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
      },
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
        { initialProps: { workers: [ruleTuning, ruleCoverage] } }
      );

      act(() => {
        rendered.result.current.updateSettings(ruleTuning, {
          extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 },
        });
        rendered.result.current.updateEnabled(ruleCoverage, true);
      });
      await act(async () => {
        await rendered.result.current.save();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(2);
      expect(mutateAsync).toHaveBeenNthCalledWith(1, {
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        patch: {
          settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
          settingsRevision: 1,
        },
      });
      expect(mutateAsync).toHaveBeenNthCalledWith(2, {
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        patch: { enabled: true },
      });

      rendered.rerender({ workers: [persistedRuleTuning, ruleCoverage] });
      return rendered;
    };

    it('shows the saved value for the Worker that succeeded and retries only the one that failed', async () => {
      const { result, rerender } = await saveWithOneFailure();

      expect(result.current.resolve(persistedRuleTuning)).toMatchObject({
        settings: { extras: { ...RULE_TUNING_EXTRAS, analysisWindowDays: 7 } },
        dirty: false,
        error: undefined,
      });
      expect(result.current.resolve(ruleCoverage)).toMatchObject({
        enabled: true,
        dirty: true,
        error: SAVE_FAILURE,
      });
      expect(result.current.dirtyWorkers.map(({ id }) => id)).toEqual([ruleCoverage.id]);

      const persistedRuleCoverage: Worker = { ...ruleCoverage, enabled: true };
      mutateAsync.mockResolvedValueOnce({ worker: persistedRuleCoverage });
      await act(async () => {
        await result.current.save();
      });

      expect(mutateAsync).toHaveBeenCalledTimes(3);
      expect(mutateAsync).toHaveBeenLastCalledWith({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
        patch: { enabled: true },
      });

      rerender({ workers: [persistedRuleTuning, persistedRuleCoverage] });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.resolve(persistedRuleCoverage)).toMatchObject({
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
      expect(result.current.resolve(ruleCoverage)).toMatchObject({
        enabled: false,
        dirty: false,
        error: undefined,
      });
      expect(result.current.resolve(persistedRuleTuning).settings.extras).toEqual({
        ...RULE_TUNING_EXTRAS,
        analysisWindowDays: 7,
      });
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });
  });
});
