/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { complexPairs } from '../datasets/complex_pairs';
import { hardCases } from '../datasets/hard_cases';
import { sampleRules } from '../datasets/sample_rules';
import { standardPairs } from '../datasets/standard_pairs';

// Rule generation only maps ids the MITRE data client lists as active, so an
// expected id that is revoked, deprecated or absent from the artifact can never
// be generated and MITRE Accuracy misses it for every model.
describe('dataset <-> MITRE artifact contract', () => {
  const activeIds = new Set(
    loadMitreArtifact()
      .filter(({ revoked, deprecated }) => !revoked && !deprecated)
      .map(({ id }) => id)
  );

  it('every technique and tactic id in the datasets is active in the MITRE artifact', () => {
    const rules = [
      ...sampleRules,
      ...standardPairs,
      ...complexPairs,
      ...hardCases.map((c) => c.output),
    ];
    const inactive = rules.flatMap(({ id, threat }) =>
      threat
        .flatMap(({ technique, tactic }) => [technique, tactic])
        .filter((mitreId) => mitreId !== '' && !activeIds.has(mitreId))
        .map((mitreId) => `${id}: ${mitreId}`)
    );

    expect(inactive).toEqual([]);
  });
});
