/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMockStixBundle } from './stix_entities.mock';
import { mapBundleToMitreEntities } from './build_artifact';

const bundle = getMockStixBundle();

describe('mapBundleToMitreEntities', () => {
  it('stamps every entity with the supplied framework and framework_version', () => {
    // Uses '18.0' as a random version example
    const entities = mapBundleToMitreEntities(bundle, 'enterprise', '18.0');
    for (const entity of entities) {
      expect(entity.framework).toBe('enterprise');
      expect(entity.framework_version).toBe('18.0');
    }
  });

  it('orders output: tactics first, then techniques, then subtechniques', () => {
    const entities = mapBundleToMitreEntities(bundle, 'enterprise', '18.0');
    const types = entities.map((e) => e.type);
    const lastTacticIdx = types.lastIndexOf('tactic');
    const firstTechniqueIdx = types.indexOf('technique');
    const lastTechniqueIdx = types.lastIndexOf('technique');
    const firstSubtechIdx = types.indexOf('subtechnique');
    expect(lastTacticIdx).toBeLessThan(firstTechniqueIdx);
    expect(lastTechniqueIdx).toBeLessThan(firstSubtechIdx);
  });
});
