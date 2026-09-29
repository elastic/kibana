/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_SETTINGS } from './floor_watch';
import { RULE_TUNING_DEFAULT_EXTRAS, RULE_TUNING_SETTINGS } from './detection_watch';
import { CONTINUOUS_THREAT_HUNT_SETTINGS } from './hunt_watch';
import type { WorkerSettingsDeclaration } from './types';
import { nearestLowerAutonomyLevel, upgradeStoredWorkerSettings } from './upgrade_stored_settings';

describe('upgradeStoredWorkerSettings', () => {
  const stored = {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '2h',
  };

  it('fills extras when the document has none', () => {
    expect(upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, stored)).toEqual({
      ...stored,
      extras: RULE_TUNING_DEFAULT_EXTRAS,
    });
  });

  it('fills only extras keys the document does not have', () => {
    expect(
      upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, {
        ...stored,
        extras: { analysisWindowDays: 21 },
      })
    ).toEqual({
      ...stored,
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 21 },
    });
  });

  it('keeps a present extras value that is out of range', () => {
    const invalid = { ...stored, extras: { analysisWindowDays: 0 } };

    expect(upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, invalid)).toEqual({
      ...invalid,
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 0 },
    });
  });

  it('returns the same object when the document already matches the declaration', () => {
    const complete = { ...stored, extras: { ...RULE_TUNING_DEFAULT_EXTRAS } };

    expect(upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, complete)).toBe(complete);
  });

  it('fills a missing schedule interval from the declaration default', () => {
    const withoutInterval = { settingsVersion: 1, autonomyLevel: 'manual' };

    expect(upgradeStoredWorkerSettings(ATTACK_DISCOVERY_SETTINGS, withoutInterval)).toEqual({
      ...withoutInterval,
      scheduleInterval: '24h',
    });
  });

  it('drops a stored extras value once the declaration no longer declares any', () => {
    const staleExtras = { ...stored, extras: { tier2When: 'always', candidateLimit: 10 } };

    expect(upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_SETTINGS, staleExtras)).toEqual(
      stored
    );
  });

  it('leaves a document with no extras alone when the declaration declares none', () => {
    expect(upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_SETTINGS, stored)).toBe(stored);
  });

  describe('autonomy the Worker no longer allows', () => {
    const complete = { ...stored, extras: { ...RULE_TUNING_DEFAULT_EXTRAS } };

    it('lowers it to the nearest allowed level below', () => {
      expect(
        upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, {
          ...complete,
          autonomyLevel: 'supervised',
        })
      ).toEqual({ ...complete, autonomyLevel: 'assisted' });
      expect(
        upgradeStoredWorkerSettings(ATTACK_DISCOVERY_SETTINGS, {
          settingsVersion: 1,
          autonomyLevel: 'assisted',
          scheduleInterval: '24h',
        })
      ).toEqual({ settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '24h' });
    });

    it('keeps a level with nothing allowed below it, for validation to reject', () => {
      const assistedOnly: WorkerSettingsDeclaration = {
        workerId: 'assisted-only',
        allowedAutonomyLevels: ['assisted'],
      };
      const document = { settingsVersion: 1, autonomyLevel: 'manual' };

      expect(upgradeStoredWorkerSettings(assistedOnly, document)).toBe(document);
    });

    it('keeps a value outside the shared scale, for validation to reject', () => {
      const document = { ...complete, autonomyLevel: 'yolo' };

      expect(upgradeStoredWorkerSettings(RULE_TUNING_SETTINGS, document)).toBe(document);
    });
  });
});

describe('nearestLowerAutonomyLevel', () => {
  it('picks the most autonomous allowed level strictly below, in any declared order', () => {
    expect(nearestLowerAutonomyLevel(['assisted', 'manual'], 'supervised')).toBe('assisted');
    expect(nearestLowerAutonomyLevel(['manual', 'supervised'], 'assisted')).toBe('manual');
  });

  it('never goes up', () => {
    expect(nearestLowerAutonomyLevel(['assisted', 'supervised'], 'manual')).toBeUndefined();
  });
});
