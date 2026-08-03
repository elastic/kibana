/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mitreEntitySchema,
  mitreAttackArtifactSchema,
  mitreAttackArtifactVersionSchema,
  mitreFrameworkSchema,
} from '../schema';
import artifactJson from '../../data/mitre_artifact.json';
import artifactVersionJson from '../../data/artifact_version.json';

describe('mitreFrameworkSchema', () => {
  it.each(['enterprise', 'mobile', 'ics', 'atlas'] as const)('accepts %s', (framework) => {
    expect(mitreFrameworkSchema.safeParse(framework).success).toBe(true);
  });

  it('rejects unknown frameworks', () => {
    expect(mitreFrameworkSchema.safeParse('cloud').success).toBe(false);
  });
});

describe('mitreEntitySchema', () => {
  const baseTactic = {
    type: 'tactic' as const,
    framework: 'enterprise' as const,
    versions: ['ATT&CK-v18.1'],
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001/',
    description: 'The adversary is trying to get into your network.',
  };

  it('parses a tactic', () => {
    expect(mitreEntitySchema.parse(baseTactic)).toEqual(baseTactic);
  });

  it('parses a technique with tactics', () => {
    const tech = {
      ...baseTactic,
      type: 'technique' as const,
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/',
      tactics: ['defense-evasion', 'persistence'],
    };
    expect(mitreEntitySchema.parse(tech)).toEqual(tech);
  });

  it('parses a subtechnique with techniqueId', () => {
    const sub = {
      ...baseTactic,
      type: 'subtechnique' as const,
      id: 'T1078.001',
      name: 'Default Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/001/',
      tactics: ['defense-evasion'],
      techniqueId: 'T1078',
    };
    expect(mitreEntitySchema.parse(sub)).toEqual(sub);
  });

  it('rejects a technique without tactics', () => {
    const bad = {
      ...baseTactic,
      type: 'technique' as const,
    };
    expect(mitreEntitySchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a subtechnique without techniqueId', () => {
    const bad = {
      ...baseTactic,
      type: 'subtechnique' as const,
      tactics: ['defense-evasion'],
    };
    expect(mitreEntitySchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an entity with an empty versions array', () => {
    expect(
      mitreEntitySchema.safeParse({
        ...baseTactic,
        versions: [],
      }).success
    ).toBe(false);
  });
});

describe('bundled artifact files', () => {
  it('artifact_version.json validates against mitreAttackArtifactVersionSchema', () => {
    expect(() => mitreAttackArtifactVersionSchema.parse(artifactVersionJson)).not.toThrow();
  });

  it('mitre_artifact.json validates against mitreAttackArtifactSchema', () => {
    expect(() => mitreAttackArtifactSchema.parse(artifactJson)).not.toThrow();
  });

  it('artifact and version files share the same stamp', () => {
    const artifact = mitreAttackArtifactSchema.parse(artifactJson);
    const version = mitreAttackArtifactVersionSchema.parse(artifactVersionJson);
    expect(artifact.stamp).toBe(version.stamp);
  });

  it('artifact contains tactics, techniques, and subtechniques for ATT&CK Enterprise', () => {
    const { entities } = mitreAttackArtifactSchema.parse(artifactJson);
    const counts = entities.reduce<Record<string, number>>((acc, e) => {
      const key = `${e.framework}:${e.type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    expect(counts['enterprise:tactic']).toBeGreaterThan(0);
    expect(counts['enterprise:technique']).toBeGreaterThan(0);
    expect(counts['enterprise:subtechnique']).toBeGreaterThan(0);
  });
});
