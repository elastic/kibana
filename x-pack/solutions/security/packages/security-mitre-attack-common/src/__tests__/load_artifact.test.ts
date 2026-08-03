/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadMitreAttackArtifact, loadMitreAttackArtifactVersion } from '../load_artifact';

describe('loadMitreAttackArtifact', () => {
  it('returns a parsed artifact with at least 100 entities', () => {
    const artifact = loadMitreAttackArtifact();
    expect(artifact.entities.length).toBeGreaterThan(100);
  });

  it('caches the result across calls (returns the same instance)', () => {
    const a = loadMitreAttackArtifact();
    const b = loadMitreAttackArtifact();
    expect(a).toBe(b);
  });

  it('every entity has the required base fields', () => {
    const artifact = loadMitreAttackArtifact();
    for (const entity of artifact.entities) {
      expect(entity.id).toBeTruthy();
      expect(entity.name).toBeTruthy();
      expect(entity.framework).toBeTruthy();
      expect(entity.versions.length).toBeGreaterThan(0);
      expect(entity.reference).toMatch(/^https?:\/\//);
      expect(typeof entity.description).toBe('string');
    }
  });

  it('subtechniques expose a parent techniqueId derived from id', () => {
    const artifact = loadMitreAttackArtifact();
    const subtechniques = artifact.entities.filter((e) => e.type === 'subtechnique');
    expect(subtechniques.length).toBeGreaterThan(0);
    for (const sub of subtechniques) {
      if (sub.type === 'subtechnique') {
        expect(sub.techniqueId).toBe(sub.id.split('.')[0]);
      }
    }
  });
});

describe('loadMitreAttackArtifactVersion', () => {
  it('returns the version stamp without throwing', () => {
    const version = loadMitreAttackArtifactVersion();
    expect(version.stamp).toBeTruthy();
    expect(version.generatedAt).toBeTruthy();
  });

  it('matches the artifact stamp', () => {
    expect(loadMitreAttackArtifactVersion().stamp).toBe(loadMitreAttackArtifact().stamp);
  });
});
