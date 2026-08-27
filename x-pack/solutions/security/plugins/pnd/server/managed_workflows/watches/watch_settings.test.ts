/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '@kbn/pnd-common';
import { createWatchSettingsRegistration } from './watch_settings';

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
