/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMockTacticEntity,
  getMockMatrixEntity,
  getMockRelationshipEntity,
  getMockMitreExternalReferences,
} from '../stix_entities.mock';
import type { StixBundle } from '../types';
import { mapTactics } from './map_tactics';

const FRAMEWORK = 'enterprise' as const;
const FRAMEWORK_VERSION = '18.0';

describe('mapTactics', () => {
  it('positions tactics by their index in tactic_refs and sorts output by position', () => {
    const tactic1 = getMockTacticEntity(); // TA0006, id='x-mitre-tactic--ta0006'
    const tactic2 = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0002',
      x_mitre_shortname: 'execution',
      external_references: getMockMitreExternalReferences('TA0002'),
    });
    // Objects list has tactic2 before tactic1, but tactic_refs orders tactic1 first.
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0006', 'x-mitre-tactic--ta0002'] }),
        tactic2,
        tactic1,
      ],
    };
    const result = mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result.map((t) => t.id)).toEqual(['TA0006', 'TA0002']);
    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
  });

  it('sets revoked and deprecated flags from stix entity properties', () => {
    const revokedTactic = getMockTacticEntity({ revoked: true }); // TA0006
    const deprecatedTactic = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0002',
      x_mitre_shortname: 'execution',
      external_references: getMockMitreExternalReferences('TA0002'),
      x_mitre_deprecated: true,
    });
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0006', 'x-mitre-tactic--ta0002'] }),
        revokedTactic,
        deprecatedTactic,
      ],
    };
    const result = mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const ta0006 = result.find((t) => t.id === 'TA0006');
    const ta0002 = result.find((t) => t.id === 'TA0002');
    expect(ta0006?.revoked).toBe(true);
    expect(ta0006?.deprecated).toBe(false);
    expect(ta0002?.revoked).toBe(false);
    expect(ta0002?.deprecated).toBe(true);
  });

  it('populates superseded_by_id from revoked-by relationships', () => {
    const revoked = getMockTacticEntity({ revoked: true }); // TA0006
    const successor = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0009',
      x_mitre_shortname: 'successor',
      external_references: getMockMitreExternalReferences('TA0009'),
    });
    const rel = getMockRelationshipEntity({
      id: 'relationship--revoked-by--ta0006--ta0009',
      relationship_type: 'revoked-by',
      source_ref: 'x-mitre-tactic--ta0006',
      target_ref: 'x-mitre-tactic--ta0009',
    });
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0006', 'x-mitre-tactic--ta0009'] }),
        revoked,
        successor,
        rel,
      ],
    };
    const result = mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    const ta0006 = result.find((t) => t.id === 'TA0006');
    expect(ta0006?.superseded_by_id).toEqual(['TA0009']);
  });

  it('skips entities that have no mitre-attack external reference', () => {
    const noRef = getMockTacticEntity({ external_references: [] }); // TA0006, no mitre ref
    const normal = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0002',
      x_mitre_shortname: 'execution',
      external_references: getMockMitreExternalReferences('TA0002'),
    });
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0006', 'x-mitre-tactic--ta0002'] }),
        noRef,
        normal,
      ],
    };
    const result = mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION);
    expect(result.map((t) => t.id)).toEqual(['TA0002']);
  });

  it('throws when an active tactic is absent from tactic_refs', () => {
    const missing = getMockTacticEntity(); // TA0006, not in tactic_refs
    const included = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0001',
      x_mitre_shortname: 'initial-access',
      external_references: getMockMitreExternalReferences('TA0001'),
    });
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0001'] }), // TA0006 not listed
        included,
        missing,
      ],
    };
    expect(() => mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION)).toThrow(
      /TA0006.*not present in x-mitre-matrix/
    );
  });

  it('throws when a revoked tactic is absent from tactic_refs', () => {
    const revokedMissing = getMockTacticEntity({ revoked: true }); // TA0006, not in tactic_refs
    const included = getMockTacticEntity({
      id: 'x-mitre-tactic--ta0001',
      x_mitre_shortname: 'initial-access',
      external_references: getMockMitreExternalReferences('TA0001'),
    });
    const bundle: StixBundle = {
      objects: [
        getMockMatrixEntity({ tactic_refs: ['x-mitre-tactic--ta0001'] }), // TA0006 not listed
        included,
        revokedMissing,
      ],
    };
    expect(() => mapTactics(bundle, FRAMEWORK, FRAMEWORK_VERSION)).toThrow(
      /TA0006.*not present in x-mitre-matrix/
    );
  });
});
