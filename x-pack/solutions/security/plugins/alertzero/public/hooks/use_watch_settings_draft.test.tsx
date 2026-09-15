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

  it('validates all dirty drafts before writing and retries only failures', async () => {
    mutateAsync
      .mockResolvedValueOnce({ worker: { ...ruleTuning, settingsRevision: 2 } })
      .mockRejectedValueOnce(new Error('conflict'));

    const { result } = renderHook(() => useWatchSettingsDraft([ruleTuning, ruleCreation]));

    act(() => {
      result.current.updateSettings(ruleTuning, { extras: { analysisWindowDays: 7 } });
      result.current.updateEnabled(ruleCreation, true);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenNthCalledWith(1, {
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      patch: { settings: { extras: { analysisWindowDays: 7 } } },
    });
    expect(mutateAsync).toHaveBeenNthCalledWith(2, {
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
      patch: { enabled: true },
    });
    expect(result.current.resolve(ruleTuning).dirty).toBe(false);
    expect(result.current.resolve(ruleCreation)).toMatchObject({
      dirty: true,
      enabled: true,
      error: 'conflict',
    });
  });
});
