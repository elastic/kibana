/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import {
  createAdGenerationWatchSettingsRegistration,
  createWatchSettingsRegistration,
} from './watch_settings';

const watchSettings = createWatchSettingsRegistration(SYSTEM_SECURITY_WATCH_FLOOR_ID);

describe('createWatchSettingsRegistration', () => {
  it('creates default managed template values', () => {
    expect(watchSettings.createDefaultValues()).toEqual({
      settingsVersion: 1,
      autonomyLevel: 'manual',
    });
  });

  it('migrates pre-version values before they are reinstalled', () => {
    expect(watchSettings.migrate({ autonomyLevel: 'assisted' })).toEqual({
      migrated: true,
      values: {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
      },
    });
  });

  it('removes unknown persisted keys without relying on key counts', () => {
    expect(
      watchSettings.migrate({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        obsoleteSetting: true,
      })
    ).toEqual({
      migrated: true,
      values: {
        settingsVersion: 1,
        autonomyLevel: 'manual',
      },
    });
  });

  it('recognizes current values and rejects incompatible persisted values', () => {
    const values = watchSettings.createDefaultValues();

    expect(watchSettings.migrate(values)).toEqual({ migrated: false, values });
    expect(() => watchSettings.migrate({ ...values, settingsVersion: 2 })).toThrow(
      `Unsupported settings version for PND watch "${SYSTEM_SECURITY_WATCH_FLOOR_ID}": 2`
    );
    expect(() => watchSettings.migrate({ ...values, autonomyLevel: 'automatic' })).toThrow(
      `PND watch "${SYSTEM_SECURITY_WATCH_FLOOR_ID}" settings contain an invalid autonomy level`
    );
  });

  it('applies every supported settings patch', () => {
    const defaults = watchSettings.createDefaultValues();
    const result = watchSettings.applyPatch(defaults, { autonomyLevel: 'supervised' });
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    expect(result.values).toEqual({ settingsVersion: 1, autonomyLevel: 'supervised' });
  });

  it('versions settings per watch so one bump does not rewrite the others', () => {
    expect(
      SYSTEM_SECURITY_WATCH_IDS.map((id) => ({
        id,
        version: createWatchSettingsRegistration(id).createDefaultValues().settingsVersion,
      }))
    ).toEqual(SYSTEM_SECURITY_WATCH_IDS.map((id) => ({ id, version: 1 })));
  });

  it('binds the projected settings to the registered watch', () => {
    const officerSettings = createWatchSettingsRegistration(SYSTEM_SECURITY_WATCH_OFFICER_ID);

    expect(officerSettings.toSettings(officerSettings.createDefaultValues())).toEqual({
      watchId: SYSTEM_SECURITY_WATCH_OFFICER_ID,
      autonomy: 'manual',
    });
  });

  it('keeps post-MVP settings out of the durable extension', () => {
    const values = watchSettings.createDefaultValues();

    expect(
      watchSettings.applyPatch(values, {
        worker: { workerId: 'alert-correlation', enabled: false },
      })
    ).toEqual({ rejected: 'worker "alert-correlation"' });
  });
});

// The Attack Discovery Generation watch is the one registration whose settings really are its
// template values: schedule cadence and generation options are what its YAML renders, so a patch
// here is what changes the worker's next tick.
describe('createAdGenerationWatchSettingsRegistration', () => {
  const adSettings = createAdGenerationWatchSettingsRegistration();

  it('creates default managed template values with the generation defaults', () => {
    expect(adSettings.createDefaultValues()).toEqual({
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleEvery: '15m',
      alertSize: 100,
      lookback: 'now-24h',
      connectorId: '',
    });
  });

  it('migrates pre-version values onto the generation defaults', () => {
    expect(adSettings.migrate({ autonomyLevel: 'assisted' })).toEqual({
      migrated: true,
      values: {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
        scheduleEvery: '15m',
        alertSize: 100,
        lookback: 'now-24h',
        connectorId: '',
      },
    });
  });

  it('recognizes current values and rejects incompatible persisted values', () => {
    const values = adSettings.createDefaultValues();

    expect(adSettings.migrate(values)).toEqual({ migrated: false, values });
    expect(() => adSettings.migrate({ ...values, settingsVersion: 2 })).toThrow(
      `Unsupported settings version for PND watch "${SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID}": 2`
    );
    expect(() => adSettings.migrate({ ...values, autonomyLevel: 'automatic' })).toThrow(
      `PND watch "${SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID}" settings contain an invalid autonomy level`
    );
  });

  it.each([
    ['every-5m', '5m'],
    ['every-15m', '15m'],
    ['every-30m', '30m'],
    ['hourly', '1h'],
  ])('maps the %s schedule option to a %s trigger interval', (scheduleId, every) => {
    const result = adSettings.applyPatch(adSettings.createDefaultValues(), {
      triggers: { scheduleId },
    });
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    expect(result.values.scheduleEvery).toBe(every);
  });

  it('rejects a schedule option outside the select vocabulary', () => {
    expect(
      adSettings.applyPatch(adSettings.createDefaultValues(), {
        triggers: { scheduleId: 'every-10s' },
      })
    ).toEqual({ rejected: 'schedule "every-10s"' });
  });

  it('applies generation patches field by field', () => {
    const result = adSettings.applyPatch(adSettings.createDefaultValues(), {
      generation: { alertSize: 250, connectorId: 'my-connector', lookback: 'now-7d' },
    });
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    expect(result.values).toEqual(
      expect.objectContaining({
        alertSize: 250,
        connectorId: 'my-connector',
        lookback: 'now-7d',
        scheduleEvery: '15m',
      })
    );
  });

  it('applies a partial generation patch without disturbing the other options', () => {
    const result = adSettings.applyPatch(
      { ...adSettings.createDefaultValues(), connectorId: 'my-connector' },
      { generation: { alertSize: 50 } }
    );
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    expect(result.values).toEqual(
      expect.objectContaining({ alertSize: 50, connectorId: 'my-connector', lookback: 'now-24h' })
    );
  });

  it.each([
    ['scope and routing settings', { scopeRouting: { dataSources: 'security' } }],
    ['approval gate "incident_contained"', { approvalGate: { gateId: 'incident_contained' } }],
    ['worker "alert-correlation"', { worker: { workerId: 'alert-correlation', enabled: false } }],
    ['skill "alert-analysis"', { skill: { skillId: 'alert-analysis', enabled: false } }],
  ])('rejects %s', (rejected, patch) => {
    expect(adSettings.applyPatch(adSettings.createDefaultValues(), patch)).toEqual({ rejected });
  });

  it('projects the schedule select and generation options into the settings', () => {
    expect(adSettings.toSettings(adSettings.createDefaultValues())).toEqual({
      watchId: SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
      autonomy: 'manual',
      triggers: {
        sharedWithAttackDiscovery: false,
        schedule: {
          optionIds: ['every-5m', 'every-15m', 'every-30m', 'hourly'],
          selectedId: 'every-15m',
        },
        allowManualRun: true,
      },
      generation: {
        alertSize: 100,
        lookback: 'now-24h',
        connectorId: '',
      },
    });
  });

  it('selects the schedule option that matches the persisted cadence', () => {
    const settings = adSettings.toSettings({
      ...adSettings.createDefaultValues(),
      scheduleEvery: '1h',
    });

    expect(settings.triggers?.schedule?.selectedId).toBe('hourly');
  });
});
