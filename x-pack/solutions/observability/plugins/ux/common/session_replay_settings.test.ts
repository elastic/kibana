/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSIONS_SYNC_DELAY } from './rum_sessions';
import {
  normalizeSessionReplaySettings,
  sdkPrivacyFromSettings,
  sdkReplayFromSettings,
  sdkSessionFromSettings,
  SESSION_IDLE_MS_DEFAULT,
  SESSION_MAX_MS_DEFAULT,
  SESSION_MAX_MS_MIN,
} from './session_replay_settings';

describe('normalizeSessionReplaySettings', () => {
  it('keeps a valid rollup sync delay', () => {
    expect(normalizeSessionReplaySettings({ syncDelay: '1m' }).syncDelay).toBe('1m');
  });

  it('falls back to the default delay when the value is invalid', () => {
    expect(normalizeSessionReplaySettings({ syncDelay: 'nope' }).syncDelay).toBe(
      RUM_SESSIONS_SYNC_DELAY
    );
    expect(normalizeSessionReplaySettings({}).syncDelay).toBe(RUM_SESSIONS_SYNC_DELAY);
  });

  it('drops the session lookback that the digitalExperience plugin now fixes', () => {
    expect(normalizeSessionReplaySettings({ sourceLookbackDays: 180 } as never)).not.toHaveProperty(
      'sourceLookbackDays'
    );
  });

  it('defaults CCS settings off', () => {
    const settings = normalizeSessionReplaySettings({});
    expect(settings.useAllRemoteClusters).toBe(false);
    expect(settings.selectedRemoteClusters).toEqual([]);
  });

  it('defaults input masking and canvas on, page text unmasked', () => {
    const settings = normalizeSessionReplaySettings({});
    expect(settings.maskAllInputs).toBe(true);
    expect(settings.maskAllText).toBe(false);
    expect(settings.recordCanvas).toBe(true);
    expect(settings.sessionMaxMs).toBe(SESSION_MAX_MS_DEFAULT);
    expect(settings.sessionIdleMs).toBe(SESSION_IDLE_MS_DEFAULT);
    expect(sdkPrivacyFromSettings(settings)).toEqual({
      maskAllInputs: true,
    });
    expect(sdkReplayFromSettings(settings).quality).toEqual({ recordCanvas: true });
    expect(sdkSessionFromSettings(settings, true)).toEqual({
      persistSession: true,
      maxMs: SESSION_MAX_MS_DEFAULT,
      idleMs: SESSION_IDLE_MS_DEFAULT,
    });
  });

  it('masks all page text only when opted in', () => {
    expect(sdkPrivacyFromSettings(normalizeSessionReplaySettings({ maskAllText: true }))).toEqual({
      maskAllInputs: true,
      maskTextSelector: '*',
    });
  });

  it('allows unmasking and canvas opt-out', () => {
    const settings = normalizeSessionReplaySettings({
      maskAllInputs: false,
      maskAllText: false,
      recordCanvas: false,
      sessionMaxMs: 60_000,
    });
    expect(settings.maskAllInputs).toBe(false);
    expect(settings.maskAllText).toBe(false);
    expect(settings.recordCanvas).toBe(false);
    expect(settings.sessionMaxMs).toBe(SESSION_MAX_MS_MIN);
    expect(sdkPrivacyFromSettings(settings)).toEqual({ maskAllInputs: false });
    expect(sdkReplayFromSettings(settings).quality).toEqual({ recordCanvas: false });
  });

  it('keeps valid remote cluster aliases', () => {
    expect(
      normalizeSessionReplaySettings({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['ccs', 'bad name', 'ok_1'],
      })
    ).toEqual(
      expect.objectContaining({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['ccs', 'ok_1'],
      })
    );
  });
});
