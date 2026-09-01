/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixEntity } from '../types';
import {
  getMockTacticEntity,
  getMockTechniqueEntity,
  getMockRelationshipEntity,
  getMockMitreExternalReferences,
} from '../stix_entities.mock';
import { getMitreReference, resolveTacticIds, resolveSupersededBy } from './helpers';

describe('getMitreReference', () => {
  it('returns id and reference for a valid mitre-attack external reference', () => {
    const tactic = getMockTacticEntity();
    const result = getMitreReference(tactic);
    expect(result).toEqual({
      id: 'TA0006',
      reference: 'https://attack.mitre.org/tactics/TA0006/',
    });
  });

  it('adds a missing trailing slash to the URL path', () => {
    const tactic = getMockTacticEntity({
      external_references: [
        {
          source_name: 'mitre-attack',
          external_id: 'TA0006',
          url: 'https://attack.mitre.org/tactics/TA0006', // no trailing slash
        },
      ],
    });
    const result = getMitreReference(tactic);
    expect(result?.reference).toBe('https://attack.mitre.org/tactics/TA0006/');
  });

  it('returns null when there is no mitre-attack external reference', () => {
    const entity: StixEntity = {
      id: 'attack-pattern--no-ref',
      type: 'attack-pattern',
      external_references: [{ source_name: 'capec', external_id: 'CAPEC-1' }],
    };
    expect(getMitreReference(entity)).toBeNull();
  });

  it('returns null when external_id is missing', () => {
    const entity: StixEntity = {
      id: 'attack-pattern--no-id',
      type: 'attack-pattern',
      external_references: [
        {
          source_name: 'mitre-attack',
          url: 'https://attack.mitre.org/techniques/T1003/',
          // external_id omitted
        },
      ],
    };
    expect(getMitreReference(entity)).toBeNull();
  });

  it('returns null when url is missing', () => {
    const entity: StixEntity = {
      id: 'attack-pattern--no-url',
      type: 'attack-pattern',
      external_references: [
        {
          source_name: 'mitre-attack',
          external_id: 'T1003',
          // url omitted
        },
      ],
    };
    expect(getMitreReference(entity)).toBeNull();
  });
});

describe('resolveTacticIds', () => {
  const tactic1 = getMockTacticEntity(); // TA0006, credential-access
  const tactic2 = getMockTacticEntity({
    id: 'x-mitre-tactic--ta0002',
    x_mitre_shortname: 'execution',
    external_references: getMockMitreExternalReferences('TA0002'),
  });
  const tacticByShortname = new Map<string, StixEntity>([
    ['credential-access', tactic1],
    ['execution', tactic2],
  ]);

  it('maps kill_chain phase names to tactic ids and sorts them', () => {
    const technique = getMockTechniqueEntity({
      kill_chain_phases: [
        { kill_chain_name: 'mitre-attack', phase_name: 'execution' },
        { kill_chain_name: 'mitre-attack', phase_name: 'credential-access' }, // unsorted input
      ],
    });
    const result = resolveTacticIds(technique, tacticByShortname);
    expect(result).toEqual(['TA0002', 'TA0006']); // sorted
  });

  it('returns [] when there are no mitre-attack kill_chain_phases', () => {
    const technique: StixEntity = {
      id: 'attack-pattern--no-phases',
      type: 'attack-pattern',
      kill_chain_phases: [{ kill_chain_name: 'other-chain', phase_name: 'credential-access' }],
    };
    expect(resolveTacticIds(technique, tacticByShortname)).toEqual([]);
  });

  it('throws for an active entity whose phase does not resolve to a tactic', () => {
    const technique = getMockTechniqueEntity({
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'nonexistent-phase' }],
    });
    expect(() => resolveTacticIds(technique, tacticByShortname)).toThrow(
      /Cannot resolve kill_chain phase 'nonexistent-phase'/
    );
  });

  it('returns [] (skips) for a revoked entity with an unresolvable phase', () => {
    const technique = getMockTechniqueEntity({
      revoked: true,
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'nonexistent-phase' }],
    });
    expect(resolveTacticIds(technique, tacticByShortname)).toEqual([]);
  });

  it('returns [] (skips) for a deprecated entity with an unresolvable phase', () => {
    const technique = getMockTechniqueEntity({
      x_mitre_deprecated: true,
      kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'nonexistent-phase' }],
    });
    expect(resolveTacticIds(technique, tacticByShortname)).toEqual([]);
  });
});

describe('resolveSupersededBy', () => {
  const successor = getMockTechniqueEntity(); // T1003, id='attack-pattern--t1003'
  const entityById = new Map<string, StixEntity>([['attack-pattern--t1003', successor]]);

  it('returns sorted successor ATT&CK ids', () => {
    // Two successors out of order to verify sorting.
    const extra = getMockTechniqueEntity({
      id: 'attack-pattern--t1002',
      external_references: getMockMitreExternalReferences('T1002'),
    });
    const entityByIdMulti = new Map<string, StixEntity>([
      ['attack-pattern--t1003', successor],
      ['attack-pattern--t1002', extra],
    ]);
    const revokedByTargetRefs = new Map<string, string[]>([
      ['attack-pattern--revoked', ['attack-pattern--t1003', 'attack-pattern--t1002']],
    ]);
    const result = resolveSupersededBy(
      'attack-pattern--revoked',
      entityByIdMulti,
      revokedByTargetRefs
    );
    expect(result).toEqual(['T1002', 'T1003']); // sorted
  });

  it('returns undefined when there is no revoked-by relationship for the entity', () => {
    const revokedByTargetRefs = new Map<string, string[]>();
    const result = resolveSupersededBy('attack-pattern--revoked', entityById, revokedByTargetRefs);
    expect(result).toBeUndefined();
  });

  it('returns the single successor id in an array', () => {
    const revokedByTargetRefs = new Map<string, string[]>([
      ['attack-pattern--revoked', ['attack-pattern--t1003']],
    ]);

    // Confirm relationship setup: revoked-by points at successor
    const rel = getMockRelationshipEntity({
      relationship_type: 'revoked-by',
      source_ref: 'attack-pattern--revoked',
      target_ref: 'attack-pattern--t1003',
    });
    expect(rel.relationship_type).toBe('revoked-by');

    const result = resolveSupersededBy('attack-pattern--revoked', entityById, revokedByTargetRefs);
    expect(result).toEqual(['T1003']);
  });
});
