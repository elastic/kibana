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
import { mapTechniques } from './map_techniques';

const FRAMEWORK = 'enterprise' as const;
const FRAMEWORK_VERSION = '18.0';

const tactic1 = getMockTacticEntity(); // TA0006, credential-access
const tactic2 = getMockTacticEntity({
  id: 'x-mitre-tactic--ta0002',
  x_mitre_shortname: 'execution',
  external_references: getMockMitreExternalReferences('TA0002'),
});
const matrix = getMockMatrixEntity({
  tactic_refs: ['x-mitre-tactic--ta0006', 'x-mitre-tactic--ta0002'],
});

describe('mapTechniques', () => {
  it('only maps non-subtechnique attack-patterns', () => {
    const technique = getMockTechniqueEntity(); // T1003
    const subtechnique = getMockSubtechniqueEntity(); // T1003.001
    const bundle: StixBundle = { objects: [matrix, tactic1, tactic2, technique, subtechnique] };
    const result = mapTechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const ids = result.map((t) => t.id);
    expect(ids).toContain('T1003');
    expect(ids).not.toContain('T1003.001');
  });

  it('collects tactic_ids from multiple kill_chain_phases', () => {
    const technique = getMockTechniqueEntity({
      kill_chain_phases: [
        { kill_chain_name: 'mitre-attack', phase_name: 'execution' },
        { kill_chain_name: 'mitre-attack', phase_name: 'credential-access' }, // unsorted input
      ],
    });
    const bundle: StixBundle = { objects: [matrix, tactic1, tactic2, technique] };
    const result = mapTechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const t1003 = result.find((t) => t.id === 'T1003');
    expect(t1003?.tactic_ids).toEqual(['TA0002', 'TA0006']); // sorted
  });

  it('sorts techniques by ATT&CK id', () => {
    const t1002 = getMockTechniqueEntity({
      id: 'attack-pattern--t1002',
      external_references: getMockMitreExternalReferences('T1002'),
    });
    const t1003 = getMockTechniqueEntity(); // T1003
    // Add t1002 before t1003 to verify sorting.
    const bundle: StixBundle = { objects: [matrix, tactic1, tactic2, t1002, t1003] };
    const result = mapTechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result.map((t) => t.id)).toEqual(['T1002', 'T1003']);
  });

  it('includes a revoked technique with revoked: true and superseded_by_id set', () => {
    const revoked = getMockTechniqueEntity({
      id: 'attack-pattern--t1002',
      external_references: getMockMitreExternalReferences('T1002'),
      revoked: true,
    });
    const successor = getMockTechniqueEntity(); // T1003
    const rel = getMockRelationshipEntity({
      id: 'relationship--revoked-by--t1002--t1003',
      relationship_type: 'revoked-by',
      source_ref: 'attack-pattern--t1002',
      target_ref: 'attack-pattern--t1003',
    });
    const bundle: StixBundle = { objects: [matrix, tactic1, tactic2, revoked, successor, rel] };
    const result = mapTechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const t1002 = result.find((t) => t.id === 'T1002');
    expect(t1002?.revoked).toBe(true);
    expect(t1002?.deprecated).toBe(false);
    expect(t1002?.superseded_by_id).toEqual(['T1003']);
  });

  it('includes a deprecated technique with deprecated: true and no superseded_by_id', () => {
    const deprecated = getMockTechniqueEntity({
      id: 'attack-pattern--t1004',
      external_references: getMockMitreExternalReferences('T1004'),
      x_mitre_deprecated: true,
    });
    const bundle: StixBundle = { objects: [matrix, tactic1, tactic2, deprecated] };
    const result = mapTechniques(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const t1004 = result.find((t) => t.id === 'T1004');
    expect(t1004?.revoked).toBe(false);
    expect(t1004?.deprecated).toBe(true);
    expect(t1004?.superseded_by_id).toBeUndefined();
  });
});
