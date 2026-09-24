/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEncodedPowershellTwin } from '../scenarios/encoded_powershell';
import { toSeededEvidence } from './seeded_evidence';
import { twinToWorld } from './seed_live';
import { withoutAttackDiscovery } from './evidence_states';

describe('toSeededEvidence', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('fp'));
  const evidence = toSeededEvidence(world);

  it('returns every seeded raw event with its source', () => {
    expect(evidence.events).toEqual(world.events.map(({ id, source }) => ({ id, source })));
  });

  it('returns only the id and source of each seeded entity', () => {
    expect(Object.keys(evidence.entities[0])).toEqual(['id', 'source']);
  });

  it('returns the seeded Attack Discovery', () => {
    expect(evidence.attackDiscovery).toBe(world.attack);
  });

  it('returns no Attack Discovery for a world without one', () => {
    expect(toSeededEvidence(withoutAttackDiscovery(world)).attackDiscovery).toBeUndefined();
  });
});
