/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS, createAd2RunMarker } from '../scenario_registry';
import {
  buildCleanProfileProvidedAlertsExamples,
  CLEAN_PROFILE_SCENARIO_KEYS,
} from './clean_profile_provided_alerts';

/** Scenario keys for the clean profile (4 attack chains, 16 alerts). */
const CLEAN_PROFILE_KEYS = [
  'encoded-powershell',
  'bits-mshta',
  'linux-curl',
  'wmi-lateral',
] as const;

const RUN_MARKER = createAd2RunMarker('clean-dataset-test');
const examples = Object.values(buildCleanProfileProvidedAlertsExamples(RUN_MARKER));

describe('clean profile provided-alerts datasets', () => {
  it('covers all four clean-profile scenario keys', () => {
    expect([...CLEAN_PROFILE_SCENARIO_KEYS].sort()).toEqual([...CLEAN_PROFILE_KEYS].sort());
    expect([...AD2_CLEAN_SCENARIO_KEYS].sort()).toEqual([...CLEAN_PROFILE_KEYS].sort());
  });

  it('defines one provided-alerts example per clean-profile scenario', () => {
    const exampleKeys = examples.map((example) => example.metadata?.scenarioKey);
    expect(exampleKeys).toEqual([...CLEAN_PROFILE_KEYS]);
    expect(examples).toHaveLength(4);
    expect(
      examples.every(
        (example) =>
          example.metadata?.fixture === 'scenario-registry' &&
          example.metadata?.seedProfile === 'clean' &&
          example.metadata?.alertCount === 4
      )
    ).toBe(true);
  });

  // The ids the examples hand the model are the ids the run's seed writes, so
  // they have to be resolved from that run's marker: a reference built from a
  // shared or generation-wide marker names documents the run under test did not
  // seed.
  it("resolves the provided alert ids against the run's own marker", () => {
    const ownIds = examples.flatMap((example) => [
      ...((example.input?.attachments?.[0]?.data as { alertIds?: string[] } | undefined)
        ?.alertIds ?? []),
    ]);
    const otherRunExamples = Object.values(
      buildCleanProfileProvidedAlertsExamples(createAd2RunMarker('another-clean-run'))
    );
    const otherIds = otherRunExamples.flatMap((example) => [
      ...((example.input?.attachments?.[0]?.data as { alertIds?: string[] } | undefined)
        ?.alertIds ?? []),
    ]);

    expect(ownIds).toHaveLength(16);
    expect(otherIds).toHaveLength(16);
    expect(otherIds.some((id) => ownIds.includes(id))).toBe(false);
  });
});
