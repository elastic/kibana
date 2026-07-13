/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from '../scenario_registry';
import {
  CLEAN_PROFILE_SCENARIO_KEYS,
  cleanProfileProvidedAlertsExamples,
} from './clean_profile_provided_alerts';

/** Portable seeder clean profile keys (ad-2.0-portable-seeder.py `profile == "clean"`). */
const PORTABLE_SEEDER_CLEAN_PROFILE_KEYS = [
  'encoded-powershell',
  'bits-mshta',
  'linux-curl',
  'wmi-lateral',
] as const;

describe('clean profile provided-alerts datasets', () => {
  it('covers the same scenario keys as the portable seeder clean profile', () => {
    expect([...CLEAN_PROFILE_SCENARIO_KEYS].sort()).toEqual(
      [...PORTABLE_SEEDER_CLEAN_PROFILE_KEYS].sort()
    );
    expect([...AD2_CLEAN_SCENARIO_KEYS].sort()).toEqual(
      [...PORTABLE_SEEDER_CLEAN_PROFILE_KEYS].sort()
    );
  });

  it('defines one provided-alerts example per clean-profile scenario', () => {
    const exampleKeys = cleanProfileProvidedAlertsExamples.map(
      (example) => example.metadata?.scenarioKey
    );
    expect(exampleKeys).toEqual([...PORTABLE_SEEDER_CLEAN_PROFILE_KEYS]);
    expect(cleanProfileProvidedAlertsExamples).toHaveLength(4);
    expect(
      cleanProfileProvidedAlertsExamples.every(
        (example) =>
          example.metadata?.fixture === 'scenario-registry' &&
          example.metadata?.seedProfile === 'clean' &&
          example.metadata?.alertCount === 4
      )
    ).toBe(true);
  });
});
