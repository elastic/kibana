/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { loadMitreArtifact } from './load_artifact';

describe('loadMitreArtifact', () => {
  const entities: MitreEntity[] = loadMitreArtifact();

  // Group entities by framework:framework_version so assertions stay correct
  // regardless of how many versions are included in the artifact.
  const groups = new Map<string, MitreEntity[]>();
  for (const entity of entities) {
    const key = `${entity.framework}:${entity.framework_version}`;
    const existing = groups.get(key) ?? [];
    existing.push(entity);
    groups.set(key, existing);
  }

  it('is non-empty and every entity carries a non-empty framework and framework_version', () => {
    expect(entities.length).toBeGreaterThan(0);
    for (const entity of entities) {
      expect(entity.framework.length).toBeGreaterThan(0);
      expect(entity.framework_version.length).toBeGreaterThan(0);
    }
  });

  it('every framework/version group contains at least one tactic, technique, and subtechnique', () => {
    expect(groups.size).toBeGreaterThan(0);
    for (const [groupKey, groupEntities] of groups) {
      const types = [...new Set(groupEntities.map((entity) => entity.type))].sort();

      // Compared as an object so a failure reports which group is incomplete.
      expect({ groupKey, types }).toEqual({
        groupKey,
        types: ['subtechnique', 'tactic', 'technique'],
      });
    }
  });

  it('within each framework/version group, every technique and subtechnique tactic_id resolves to a tactic in that same group', () => {
    for (const groupEntities of groups.values()) {
      const tacticIds = new Set(groupEntities.filter((e) => e.type === 'tactic').map((e) => e.id));
      for (const entity of groupEntities) {
        if (entity.type === 'technique' || entity.type === 'subtechnique') {
          for (const tacticId of entity.tactic_ids) {
            expect(tacticIds).toContain(tacticId);
          }
        }
      }
    }
  });

  it('every subtechnique technique_id equals its own id dot prefix', () => {
    for (const entity of entities) {
      if (entity.type === 'subtechnique') {
        expect(entity.technique_id).toBe(entity.id.split('.')[0]);
      }
    }
  });
});
