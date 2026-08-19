/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { watchFloorSettings, type WatchFloorTemplateValues } from './watch_floor_settings';

describe('watchFloorSettings', () => {
  it('creates default managed template values', () => {
    const values = watchFloorSettings.createDefaultValues();

    expect(values).toEqual({ settingsVersion: 1, autonomyLevel: 'manual' });
  });

  it('migrates pre-version values before they are reinstalled', () => {
    expect(watchFloorSettings.migrate({ autonomyLevel: 'assisted' })).toEqual({
      migrated: true,
      values: {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
      },
    });
  });

  it('removes unknown persisted keys without relying on key counts', () => {
    expect(
      watchFloorSettings.migrate({
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
    const values = watchFloorSettings.createDefaultValues();

    expect(watchFloorSettings.migrate(values)).toEqual({ migrated: false, values });
    expect(() => watchFloorSettings.migrate({ ...values, settingsVersion: 2 })).toThrow(
      'Unsupported Watch Floor settings version: 2'
    );
    expect(() => watchFloorSettings.migrate({ ...values, autonomyLevel: 'automatic' })).toThrow(
      'Watch Floor settings contain an invalid autonomy level'
    );
  });

  it('applies every supported settings patch', () => {
    const defaults = watchFloorSettings.createDefaultValues();
    const result = watchFloorSettings.applyPatch(defaults, { autonomyLevel: 'supervised' });
    if ('rejected' in result) throw new Error(`Unexpected rejection: ${result.rejected}`);

    const updated: WatchFloorTemplateValues = result.values;
    expect(updated).toEqual({ settingsVersion: 1, autonomyLevel: 'supervised' });
  });

  it('keeps post-MVP settings out of the durable extension', () => {
    const values = watchFloorSettings.createDefaultValues();

    expect(
      watchFloorSettings.applyPatch(values, {
        worker: { workerId: 'alert-correlation', enabled: false },
      })
    ).toEqual({ rejected: 'worker "alert-correlation"' });
  });
});
