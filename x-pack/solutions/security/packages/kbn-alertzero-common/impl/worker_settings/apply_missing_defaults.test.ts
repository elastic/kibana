/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_SETTINGS } from './floor_watch';
import { RULE_TUNING_DEFAULT_EXTRAS, RULE_TUNING_SETTINGS } from './detection_watch';
import { applyMissingWorkerSettingDefaults } from './apply_missing_defaults';

describe('applyMissingWorkerSettingDefaults', () => {
  const stored = {
    settingsVersion: 1,
    autonomyLevel: 'manual',
    scheduleInterval: '2h',
  };

  it('fills extras when the document has none', () => {
    expect(applyMissingWorkerSettingDefaults(RULE_TUNING_SETTINGS, stored)).toEqual({
      ...stored,
      extras: RULE_TUNING_DEFAULT_EXTRAS,
    });
  });

  it('fills only extras keys the document does not have', () => {
    expect(
      applyMissingWorkerSettingDefaults(RULE_TUNING_SETTINGS, {
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

    expect(applyMissingWorkerSettingDefaults(RULE_TUNING_SETTINGS, invalid)).toEqual({
      ...invalid,
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 0 },
    });
  });

  it('returns the same object when every defaulted key is already stored', () => {
    const complete = { ...stored, extras: { ...RULE_TUNING_DEFAULT_EXTRAS } };

    expect(applyMissingWorkerSettingDefaults(RULE_TUNING_SETTINGS, complete)).toBe(complete);
  });

  it('fills a missing schedule interval from the declaration default', () => {
    const withoutInterval = { settingsVersion: 1, autonomyLevel: 'manual' };

    expect(applyMissingWorkerSettingDefaults(ATTACK_DISCOVERY_SETTINGS, withoutInterval)).toEqual({
      ...withoutInterval,
      scheduleInterval: '24h',
    });
  });
});
