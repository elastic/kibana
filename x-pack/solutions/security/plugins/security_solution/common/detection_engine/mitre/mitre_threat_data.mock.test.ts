/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreEntity,
  MitreTechnique,
  MitreSubtechnique,
} from '@kbn/security-mitre-attack-common';
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import { getDuplicateTechniqueThreatData, getMockThreatData } from './mitre_threat_data.mock';

const byId = new Map<string, MitreEntity>(loadMitreArtifact().map((e) => [e.id, e]));

const requireEntity = (id: string): MitreEntity => {
  const entity = byId.get(id);
  if (!entity) {
    throw new Error(`MITRE id ${id} is not present in the bundled artifact`);
  }
  return entity;
};

const requireTechnique = (id: string): MitreTechnique => {
  const entity = requireEntity(id);
  if (entity.type !== 'technique') {
    throw new Error(`MITRE id ${id} is a ${entity.type}, expected a technique`);
  }
  return entity;
};

const requireSubtechnique = (id: string): MitreSubtechnique => {
  const entity = requireEntity(id);
  if (entity.type !== 'subtechnique') {
    throw new Error(`MITRE id ${id} is a ${entity.type}, expected a subtechnique`);
  }
  return entity;
};

describe('getMockThreatData', () => {
  it('has distinct technique ids across all entries', () => {
    const ids = getMockThreatData().map((entry) => entry.technique.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it.each(getMockThreatData().map((e) => [e.technique.id, e] as const))(
    '%s',
    (_techniqueId, entry) => {
      const { tactic, technique, subtechnique } = entry;

      const tacticEntity = requireEntity(tactic.id);
      const techniqueEntity = requireTechnique(technique.id);
      const subtechniqueEntity = requireSubtechnique(subtechnique.id);

      // Each resolved entity has the expected type
      expect(tacticEntity.type).toBe('tactic');

      // Names and references match the artifact
      expect(tacticEntity.name).toBe(tactic.name);
      expect(tacticEntity.reference).toBe(tactic.reference);
      expect(techniqueEntity.name).toBe(technique.name);
      expect(techniqueEntity.reference).toBe(technique.reference);
      expect(subtechniqueEntity.name).toBe(subtechnique.name);
      expect(subtechniqueEntity.reference).toBe(subtechnique.reference);

      // Neither revoked nor deprecated
      expect(tacticEntity.revoked).toBe(false);
      expect(tacticEntity.deprecated).toBe(false);
      expect(techniqueEntity.revoked).toBe(false);
      expect(techniqueEntity.deprecated).toBe(false);
      expect(subtechniqueEntity.revoked).toBe(false);
      expect(subtechniqueEntity.deprecated).toBe(false);

      // The technique's tactic_ids contains the entry's tactic id
      expect(techniqueEntity.tactic_ids).toContain(tactic.id);

      // The subtechnique's technique_id equals the technique id and
      // its tactic_ids contains the tactic id
      expect(subtechniqueEntity.technique_id).toBe(technique.id);
      expect(subtechniqueEntity.tactic_ids).toContain(tactic.id);
    }
  );
});

describe('getDuplicateTechniqueThreatData', () => {
  it('both entries share the same technique id', () => {
    const [first, second] = getDuplicateTechniqueThreatData();
    expect(first.technique.id).toBe(second.technique.id);
  });

  it('the two entries have different tactic ids', () => {
    const [first, second] = getDuplicateTechniqueThreatData();
    expect(first.tactic.id).not.toBe(second.tactic.id);
  });

  it("the artifact technique's tactic_ids contains both tactic ids (multi-tactic technique)", () => {
    const [first, second] = getDuplicateTechniqueThreatData();
    const techniqueEntity = requireTechnique(first.technique.id);
    expect(techniqueEntity.tactic_ids).toContain(first.tactic.id);
    expect(techniqueEntity.tactic_ids).toContain(second.tactic.id);
  });

  it('names and references match the artifact for both entries', () => {
    for (const entry of getDuplicateTechniqueThreatData()) {
      const { tactic, technique } = entry;
      const tacticEntity = requireEntity(tactic.id);
      const techniqueEntity = requireEntity(technique.id);
      expect(tacticEntity.name).toBe(tactic.name);
      expect(tacticEntity.reference).toBe(tactic.reference);
      expect(techniqueEntity.name).toBe(technique.name);
      expect(techniqueEntity.reference).toBe(technique.reference);
    }
  });
});
