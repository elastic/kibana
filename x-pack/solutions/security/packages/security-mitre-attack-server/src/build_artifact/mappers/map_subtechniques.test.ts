/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMockTacticEntity,
  getMockTechniqueEntity,
  getMockSubtechniqueEntity,
  getMockMatrixEntity,
  getMockRelationshipEntity,
  getMockMitreExternalReferences,
} from '../stix_entities.mock';
import type { StixBundle } from '../types';
import { mapSubtechniques } from './map_subtechniques';

const FRAMEWORK = 'enterprise' as const;
const FRAMEWORK_VERSION = '18.0';

const tactic = getMockTacticEntity(); // TA0006, credential-access
const matrix = getMockMatrixEntity(); // tactic_refs: ['x-mitre-tactic--ta0006']
const technique = getMockTechniqueEntity(); // T1003, credential-access phase

describe('mapSubtechniques', () => {
  it('only maps attack-patterns with x_mitre_is_subtechnique: true', () => {
    const subtechnique = getMockSubtechniqueEntity(); // T1003.001
    const rel = getMockRelationshipEntity(); // subtechnique-of, T1003.001 -> T1003
    const bundle: StixBundle = { objects: [matrix, tactic, technique, subtechnique, rel] };
    const result = mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const ids = result.map((s) => s.id);
    expect(ids).toContain('T1003.001');
    expect(ids).not.toContain('T1003');
  });

  it('resolves technique_id from the subtechnique-of relationship', () => {
    const subtechnique = getMockSubtechniqueEntity(); // T1003.001
    const rel = getMockRelationshipEntity(); // subtechnique-of, T1003.001 -> T1003
    const bundle: StixBundle = { objects: [matrix, tactic, technique, subtechnique, rel] };
    const result = mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result[0].technique_id).toBe('T1003');
  });

  it('falls back to the dot prefix when the subtechnique-of relationship is missing', () => {
    const subtechnique = getMockSubtechniqueEntity(); // T1003.001, dot prefix implies T1003
    // No subtechnique-of relationship in the bundle.
    const bundle: StixBundle = { objects: [matrix, tactic, technique, subtechnique] };
    const result = mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result[0].technique_id).toBe('T1003');
  });

  it('throws when the subtechnique-of relationship disagrees with the dot prefix', () => {
    const wrongParent = getMockTechniqueEntity({
      id: 'attack-pattern--t9999',
      external_references: getMockMitreExternalReferences('T9999'),
    });
    const subtechnique = getMockSubtechniqueEntity(); // T1003.001, dot prefix implies T1003
    const badRel = getMockRelationshipEntity({
      target_ref: 'attack-pattern--t9999', // T9999 != T1003 (the dot prefix)
    });
    const bundle: StixBundle = {
      objects: [matrix, tactic, technique, wrongParent, subtechnique, badRel],
    };
    expect(() => mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION)).toThrow(
      /dot-prefix implies parent/
    );
  });

  it('populates tactic_ids from kill_chain_phases', () => {
    const subtechnique = getMockSubtechniqueEntity(); // credential-access phase -> TA0006
    const rel = getMockRelationshipEntity(); // subtechnique-of, T1003.001 -> T1003
    const bundle: StixBundle = { objects: [matrix, tactic, technique, subtechnique, rel] };
    const result = mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result[0].tactic_ids).toEqual(['TA0006']);
  });

  it('sorts subtechniques by ATT&CK id', () => {
    const sub002 = getMockSubtechniqueEntity({
      id: 'attack-pattern--t1003-002',
      external_references: getMockMitreExternalReferences('T1003.002'),
    });
    const sub001 = getMockSubtechniqueEntity(); // T1003.001
    const rel001 = getMockRelationshipEntity(); // subtechnique-of, T1003.001 -> T1003
    const rel002 = getMockRelationshipEntity({
      id: 'relationship--subtechnique-of--t1003-002--t1003',
      source_ref: 'attack-pattern--t1003-002',
      target_ref: 'attack-pattern--t1003',
    });
    // Add sub002 before sub001 to verify sorting.
    const bundle: StixBundle = {
      objects: [matrix, tactic, technique, sub002, sub001, rel001, rel002],
    };
    const result = mapSubtechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result.map((s) => s.id)).toEqual(['T1003.001', 'T1003.002']);
  });
});
