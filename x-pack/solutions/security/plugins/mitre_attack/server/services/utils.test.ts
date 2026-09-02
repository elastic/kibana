/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMockMitreTactic,
  getMockMitreTechnique,
  getMockMitreSubtechnique,
} from '../mocks/mitre_entities.mock';
import type { MitreEntityType } from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../saved_objects';
import {
  buildSoId,
  buildKqlFilter,
  summarizeEntityCounts,
  getEmptyMitreEntityCollection,
} from './utils';

describe('buildSoId', () => {
  it('builds a colon-delimited id for a tactic', () => {
    const tactic = getMockMitreTactic();
    expect(
      buildSoId({
        framework: tactic.framework,
        frameworkVersion: tactic.framework_version,
        id: tactic.id,
      })
    ).toBe('enterprise:15.1:TA0001');
  });

  it('builds a colon-delimited id for a technique', () => {
    const technique = getMockMitreTechnique();
    expect(
      buildSoId({
        framework: technique.framework,
        frameworkVersion: technique.framework_version,
        id: technique.id,
      })
    ).toBe('enterprise:15.1:T1003');
  });

  it('builds a colon-delimited id for a dotted subtechnique id', () => {
    const subtechnique = getMockMitreSubtechnique();
    expect(
      buildSoId({
        framework: subtechnique.framework,
        frameworkVersion: subtechnique.framework_version,
        id: subtechnique.id,
      })
    ).toBe('enterprise:15.1:T1003.001');
  });
});

describe('buildKqlFilter', () => {
  it('returns only the framework clause when no other options are provided', () => {
    const filter = buildKqlFilter({ framework: 'enterprise' });
    expect(filter).toBe(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.framework: "enterprise"`);
  });

  it('appends frameworkVersion clause joined with AND', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', frameworkVersion: '15.1' });
    expect(filter).toBe(
      `${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.framework: "enterprise" AND ` +
        `${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.framework_version: "15.1"`
    );
  });

  it('appends revoked and deprecated clauses when status is active', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', status: 'active' });
    expect(filter).toContain(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.revoked: false`);
    expect(filter).toContain(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.deprecated: false`);
  });

  it('does not append revoked or deprecated clauses when status is all', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', status: 'all' });
    expect(filter).not.toContain('revoked');
    expect(filter).not.toContain('deprecated');
  });

  it('appends a single type clause in parentheses', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', types: ['technique'] });
    expect(filter).toContain(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.type: ("technique")`);
  });

  it('OR-joins multiple types inside the parentheses', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', types: ['tactic', 'technique'] });
    expect(filter).toContain(
      `${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.type: ("tactic" OR "technique")`
    );
  });

  it('omits the type clause for an empty types array', () => {
    const filter = buildKqlFilter({ framework: 'enterprise', types: [] });
    expect(filter).not.toContain('attributes.type');
  });

  it('every field path in the output includes the .attributes. segment', () => {
    const filter = buildKqlFilter({
      framework: 'enterprise',
      frameworkVersion: '15.1',
      types: ['tactic', 'technique'],
      status: 'active',
    });
    // Split on ' AND ' and verify every clause references .attributes.
    const clauses = filter.split(' AND ');
    for (const clause of clauses) {
      expect(clause).toContain('.attributes.');
    }
  });

  it('escapes a frameworkVersion containing a double-quote and KQL operators', () => {
    const injection = '15.1" OR framework: "*';
    const filter = buildKqlFilter({ framework: 'enterprise', frameworkVersion: injection });
    // The injected text must remain inside the quoted clause, not produce a breakout
    expect(filter).not.toContain('" OR framework: "');
    expect(filter).toContain('.attributes.framework_version: ');
  });

  it('escapes each entry in types containing a double-quote and KQL operators', () => {
    const maliciousType = 'tactic" OR framework: "*' as unknown as MitreEntityType;
    const filter = buildKqlFilter({ framework: 'enterprise', types: [maliciousType] });
    // The injected text must remain inside the parenthesised clause
    expect(filter).not.toContain('" OR framework: "');
    expect(filter).toContain('.attributes.type: ');
  });
});

describe('summarizeEntityCounts', () => {
  it('returns empty string for an empty array', () => {
    expect(summarizeEntityCounts([])).toBe('');
  });

  it('returns a single entry for entities with one framework/version', () => {
    const entities = [getMockMitreTactic(), getMockMitreTechnique(), getMockMitreSubtechnique()];
    expect(summarizeEntityCounts(entities)).toBe('enterprise@15.1: 3');
  });

  it('returns multiple entries for entities spanning multiple framework/version pairs', () => {
    const entities = [
      getMockMitreTactic({ framework_version: '19.1' }),
      getMockMitreTechnique({ framework_version: '19.1' }),
      getMockMitreSubtechnique({ framework_version: '18.0' }),
    ];
    expect(summarizeEntityCounts(entities)).toBe('enterprise@19.1: 2, enterprise@18.0: 1');
  });

  it('counts a single entity correctly', () => {
    expect(summarizeEntityCounts([getMockMitreTactic()])).toBe('enterprise@15.1: 1');
  });
});

describe('emptyMitreEntityCollection', () => {
  it('returns an empty collection with the given framework and no frameworkVersion', () => {
    const result = getEmptyMitreEntityCollection('enterprise');
    expect(result.framework).toBe('enterprise');
    expect(result.tactics).toEqual([]);
    expect(result.techniques).toEqual([]);
    expect(result.subtechniques).toEqual([]);
    expect(result.frameworkVersion).toBeUndefined();
  });

  it('returns a stable empty array reference per call', () => {
    const first = getEmptyMitreEntityCollection('enterprise');
    const second = getEmptyMitreEntityCollection('enterprise');
    expect(first).not.toBe(second);
    expect(first.tactics).not.toBe(second.tactics);
  });
});
