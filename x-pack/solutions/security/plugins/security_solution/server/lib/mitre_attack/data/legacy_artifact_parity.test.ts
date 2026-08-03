/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loadMitreAttackArtifact,
  loadMitreAttackArtifactVersion,
} from '@kbn/security-mitre-attack-common';

import {
  tactics,
  techniques,
  subtechniques,
  MITRE_ATTACK_VERSION,
} from '../../../../common/detection_engine/mitre/mitre_tactics_techniques';

/**
 * While `managedMitreSourceEnabled` is experimental, the hardcoded blob and the
 * managed-index artifact ship side by side and a rule authored against one must
 * resolve identically against the other. These assertions fail loudly if only
 * one of the two generators is re-run after a MITRE content bump.
 */
describe('managed MITRE artifact parity with the legacy blob', () => {
  const artifact = loadMitreAttackArtifact();

  const artifactByType = {
    tactic: artifact.entities.filter((e) => e.type === 'tactic'),
    technique: artifact.entities.filter((e) => e.type === 'technique'),
    subtechnique: artifact.entities.filter((e) => e.type === 'subtechnique'),
  };

  const artifactById = new Map(artifact.entities.map((e) => [`${e.type}:${e.id}`, e]));

  it('is generated from the same ATT&CK content version as the legacy blob', () => {
    expect(loadMitreAttackArtifactVersion().stamp).toContain(MITRE_ATTACK_VERSION);
  });

  it.each([
    ['tactic', tactics] as const,
    ['technique', techniques] as const,
    ['subtechnique', subtechniques] as const,
  ])('covers exactly the same set of %s ids', (type, legacyEntries) => {
    const legacyIds = legacyEntries.map(({ id }) => id).sort();
    const artifactIds = artifactByType[type].map(({ id }) => id).sort();

    expect(artifactIds).toEqual(legacyIds);
  });

  it.each([
    ['tactic', tactics] as const,
    ['technique', techniques] as const,
    ['subtechnique', subtechniques] as const,
  ])('agrees with the legacy blob on every %s name and reference', (type, legacyEntries) => {
    const legacy = legacyEntries
      .map(({ id, name, reference }) => ({ id, name, reference }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const fromArtifact = legacy.map(({ id }) => {
      const entity = artifactById.get(`${type}:${id}`);
      return { id, name: entity?.name, reference: entity?.reference };
    });

    expect(fromArtifact).toEqual(legacy);
  });

  it.each([['technique', techniques] as const, ['subtechnique', subtechniques] as const])(
    'agrees with the legacy blob on the tactic linkage of every %s',
    (type, legacyEntries) => {
      const legacy = legacyEntries
        .map(({ id, tactics: linked }) => ({ id, tactics: [...linked].sort() }))
        .sort((a, b) => a.id.localeCompare(b.id));

      const fromArtifact = legacy.map(({ id }) => {
        const entity = artifactById.get(`${type}:${id}`);
        const linked = entity && 'tactics' in entity ? entity.tactics : [];
        return { id, tactics: [...linked].sort() };
      });

      expect(fromArtifact).toEqual(legacy);
    }
  );

  it('derives every subtechnique parent from its own id', () => {
    const orphans = artifactByType.subtechnique.filter((sub) => {
      const parentId = sub.id.split('.')[0];
      return !artifactById.has(`technique:${parentId}`);
    });

    expect(orphans).toEqual([]);
  });
});
