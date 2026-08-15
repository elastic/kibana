/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSIONS_LOOKBACK_DAYS, RUM_SESSIONS_SYNC_DELAY } from './rum_sessions';
import { normalizeSessionReplaySettings } from './session_replay_settings';

describe('normalizeSessionReplaySettings', () => {
  it('keeps a valid transform sync delay', () => {
    expect(normalizeSessionReplaySettings({ syncDelay: '1m' }).syncDelay).toBe('1m');
  });

  it('falls back to the default delay when the value is invalid', () => {
    expect(normalizeSessionReplaySettings({ syncDelay: 'nope' }).syncDelay).toBe(
      RUM_SESSIONS_SYNC_DELAY
    );
    expect(normalizeSessionReplaySettings({}).syncDelay).toBe(RUM_SESSIONS_SYNC_DELAY);
  });

  it('clamps session lookback days', () => {
    expect(normalizeSessionReplaySettings({ sourceLookbackDays: 180 }).sourceLookbackDays).toBe(
      180
    );
    expect(normalizeSessionReplaySettings({ sourceLookbackDays: 0 }).sourceLookbackDays).toBe(1);
    expect(normalizeSessionReplaySettings({ sourceLookbackDays: 999 }).sourceLookbackDays).toBe(
      400
    );
    expect(normalizeSessionReplaySettings({}).sourceLookbackDays).toBe(RUM_SESSIONS_LOOKBACK_DAYS);
  });
});
