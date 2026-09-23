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

/** Scenario keys for the clean profile (4 attack chains, 16 alerts). */
const CLEAN_PROFILE_KEYS = [
  'encoded-powershell',
  'bits-mshta',
  'linux-curl',
  'wmi-lateral',
] as const;

describe('clean profile provided-alerts datasets', () => {
  it('covers all four clean-profile scenario keys', () => {
    expect([...CLEAN_PROFILE_SCENARIO_KEYS].sort()).toEqual([...CLEAN_PROFILE_KEYS].sort());
    expect([...AD2_CLEAN_SCENARIO_KEYS].sort()).toEqual([...CLEAN_PROFILE_KEYS].sort());
  });

  it('defines one provided-alerts example per clean-profile scenario', () => {
    const exampleKeys = cleanProfileProvidedAlertsExamples.map(
      (example) => example.metadata?.scenarioKey
    );
    expect(exampleKeys).toEqual([...CLEAN_PROFILE_KEYS]);
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
