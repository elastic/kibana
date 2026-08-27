/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DARK_ID } from '@kbn/pnd-common';
import { createDarkWatchSettingsRegistration } from './watch_dark_settings';

const darkWatchSettings = createDarkWatchSettingsRegistration();

describe('createDarkWatchSettingsRegistration', () => {
  it('creates Dark defaults including CommonWatchSettings and Dark dials', () => {
    expect(darkWatchSettings.createDefaultValues()).toEqual({
      settingsVersion: 1,
      autonomyLevel: 'supervised',
      scheduleId: 'every-4h',
      allowManualRun: true,
      scopes: [
        { name: 'Mail · IdP', access: 'full', label: 'Read + monitor' },
        { name: 'Edge / VPN', access: 'full', label: 'Read + monitor' },
        { name: 'Customer data', access: 'denied', label: 'No access' },
      ],
      inferenceEndpointId: '',
      tier2When: 'on_hits',
      candidateLimit: 10,
      fanOutMax: 10,
      huntCooldownMinutes: 240,
    });
  });

  it('migrates slim autonomy-only values onto Dark defaults', () => {
    expect(darkWatchSettings.migrate({ autonomyLevel: 'assisted' })).toEqual({
      migrated: true,
      values: {
        ...darkWatchSettings.createDefaultValues(),
        autonomyLevel: 'assisted',
      },
    });
  });

  it('applies autonomy, trigger, and dark dial patches', () => {
    const defaults = darkWatchSettings.createDefaultValues();
    const result = darkWatchSettings.applyPatch(defaults, {
      autonomyLevel: 'manual',
      triggers: { scheduleId: 'every-2h', allowManualRun: false },
      dark: {
        inferenceEndpointId: 'my-inference-endpoint',
        tier2When: 'always',
        candidateLimit: 5,
      },
    });
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    expect(result.values).toEqual({
      ...defaults,
      autonomyLevel: 'manual',
      scheduleId: 'every-2h',
      allowManualRun: false,
      inferenceEndpointId: 'my-inference-endpoint',
      tier2When: 'always',
      candidateLimit: 5,
    });
  });

  it('projects Dark settings including the dark extension', () => {
    expect(darkWatchSettings.toSettings(darkWatchSettings.createDefaultValues())).toEqual({
      watchId: SYSTEM_SECURITY_WATCH_DARK_ID,
      autonomy: 'supervised',
      dark: {
        inferenceEndpointId: '',
        tier2When: 'on_hits',
        candidateLimit: 10,
        fanOutMax: 10,
        huntCooldownMinutes: 240,
        scheduleId: 'every-4h',
        allowManualRun: true,
        scopes: [
          { name: 'Mail · IdP', access: 'full', label: 'Read + monitor' },
          { name: 'Edge / VPN', access: 'full', label: 'Read + monitor' },
          { name: 'Customer data', access: 'denied', label: 'No access' },
        ],
      },
    });
  });

  it('rejects an out-of-range scheduleId', () => {
    expect(() =>
      darkWatchSettings.applyPatch(darkWatchSettings.createDefaultValues(), {
        triggers: { scheduleId: 'every-48h', allowManualRun: true },
      })
    ).toThrow(/invalid scheduleId/);
  });

  it('rejects post-MVP worker patches', () => {
    expect(
      darkWatchSettings.applyPatch(darkWatchSettings.createDefaultValues(), {
        worker: { workerId: 'continuous-threat-hunt', enabled: false },
      })
    ).toEqual({ rejected: 'worker "continuous-threat-hunt"' });
  });
});
