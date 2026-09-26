/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALERT_TRIAGE_SETTINGS, ATTACK_DISCOVERY_SETTINGS } from './floor_watch';
import { migrateStoredTemplateValues, renameStoredField } from './migrate';
import type { WorkerSettingsDeclaration } from './types';

const renamedExtrasDeclaration: WorkerSettingsDeclaration = {
  workerId: 'example-worker',
  settingsVersion: 2,
  allowedAutonomyLevels: ['manual'],
  extras: {
    schema: z.object({ windowDays: z.number(), fpCountThreshold: z.number() }).strict(),
    defaultValue: { windowDays: 7, fpCountThreshold: 10 },
  },
  migrations: [
    (stored) => {
      const { extras } = stored;
      if (typeof extras !== 'object' || extras === null || Array.isArray(extras)) {
        return stored;
      }
      const renamed = renameStoredField(
        extras as Record<string, unknown>,
        'analysisWindowDays',
        'windowDays'
      );
      if (renamed === extras) {
        return stored;
      }
      return { ...stored, extras: renamed };
    },
  ],
};

describe('renameStoredField', () => {
  const stored = { scheduleInterval: '30m', autonomyLevel: 'manual' };

  it('copies the old field onto the new name and drops the old one', () => {
    expect(renameStoredField(stored, 'scheduleInterval', 'runInterval')).toEqual({
      autonomyLevel: 'manual',
      runInterval: '30m',
    });
  });

  it('keeps a value already stored under the new name', () => {
    expect(
      renameStoredField({ ...stored, runInterval: '6h' }, 'scheduleInterval', 'runInterval')
    ).toEqual({ autonomyLevel: 'manual', runInterval: '6h' });
  });

  it('returns the same object when the old field is absent', () => {
    const current = { runInterval: '6h', autonomyLevel: 'manual' };

    expect(renameStoredField(current, 'scheduleInterval', 'runInterval')).toBe(current);
  });
});

describe('migrateStoredTemplateValues', () => {
  it('fills a missing schedule interval from the declaration default', () => {
    expect(
      migrateStoredTemplateValues(ATTACK_DISCOVERY_SETTINGS, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
      })
    ).toEqual({ settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '24h' });
  });

  it('drops a schedule interval from a worker that no longer declares one', () => {
    expect(
      migrateStoredTemplateValues(ALERT_TRIAGE_SETTINGS, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '30m',
      })
    ).toEqual({ settingsVersion: 1, autonomyLevel: 'manual' });
  });

  it('projects autonomy down to a level the worker still offers', () => {
    expect(
      migrateStoredTemplateValues(ATTACK_DISCOVERY_SETTINGS, {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
        scheduleInterval: '24h',
      })
    ).toEqual({ settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '24h' });
  });

  it('renames an extras field and fills keys the step did not set', () => {
    expect(
      migrateStoredTemplateValues(renamedExtrasDeclaration, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        extras: { analysisWindowDays: 21 },
      })
    ).toEqual({
      settingsVersion: 2,
      autonomyLevel: 'manual',
      extras: { windowDays: 21, fpCountThreshold: 10 },
    });
  });

  it('walks one field through two renames when the stored version is two behind', () => {
    const declaration: WorkerSettingsDeclaration = {
      workerId: 'example-worker',
      settingsVersion: 3,
      allowedAutonomyLevels: ['manual'],
      migrations: [
        (stored) => renameStoredField(stored, 'scheduleInterval', 'runInterval'),
        (stored) => renameStoredField(stored, 'runInterval', 'scheduleTime'),
      ],
    };

    expect(
      migrateStoredTemplateValues(declaration, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '30m',
      })
    ).toEqual({
      settingsVersion: 3,
      autonomyLevel: 'manual',
      scheduleTime: '30m',
    });
  });

  it('runs a shared field rename before the worker chain', () => {
    let sawRenamedInterval = false;
    const declaration: WorkerSettingsDeclaration = {
      workerId: 'example-worker',
      settingsVersion: 2,
      allowedAutonomyLevels: ['manual'],
      migrations: [
        (stored) => {
          sawRenamedInterval =
            stored.runInterval === '30m' && !Object.hasOwn(stored, 'scheduleInterval');
          return stored;
        },
      ],
    };

    const migrated = migrateStoredTemplateValues(
      declaration,
      { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '30m' },
      [(stored) => renameStoredField(stored, 'scheduleInterval', 'runInterval')]
    );

    expect(sawRenamedInterval).toBe(true);
    expect(migrated).toEqual({
      settingsVersion: 2,
      autonomyLevel: 'manual',
      runInterval: '30m',
    });
  });

  it('leaves a stored version newer than the declaration unchanged', () => {
    const stored = { settingsVersion: 3, autonomyLevel: 'manual', scheduleInterval: '24h' };

    expect(migrateStoredTemplateValues(ATTACK_DISCOVERY_SETTINGS, stored)).toBe(stored);
  });

  it('throws when a version bump has no migration step', () => {
    const declaration: WorkerSettingsDeclaration = {
      ...ATTACK_DISCOVERY_SETTINGS,
      settingsVersion: 2,
    };

    expect(() =>
      migrateStoredTemplateValues(declaration, {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '24h',
      })
    ).toThrow(/missing a settings migration from version 1 to 2/);
  });

  it('returns the same object when the stored values are already current', () => {
    const stored = { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '24h' };

    expect(migrateStoredTemplateValues(ATTACK_DISCOVERY_SETTINGS, stored)).toBe(stored);
  });
});
