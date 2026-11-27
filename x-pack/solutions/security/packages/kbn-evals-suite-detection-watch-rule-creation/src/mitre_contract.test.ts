/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { canaryDataset } from '../datasets/canary';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';

// Rule creation only maps ids the MITRE data client lists as active, so an
// expected id that is revoked, deprecated or absent from the artifact can never
// be generated and its row scores 0 for every model.
describe('dataset <-> MITRE artifact contract', () => {
  const activeIds = new Set(
    loadMitreArtifact()
      .filter(({ revoked, deprecated }) => !revoked && !deprecated)
      .map(({ id }) => id)
  );

  it('every technique id in the datasets is active in the MITRE artifact', () => {
    const inactive = [...goldenDataset, ...hardCases, ...canaryDataset].flatMap(
      ({ id, input, output }) =>
        [input.technique, ...output.mitreIds, ...(output.optionalMitreIds ?? [])]
          .filter((mitreId) => !activeIds.has(mitreId))
          .map((mitreId) => `${id}: ${mitreId}`)
    );

    expect(inactive).toEqual([]);
  });
});
