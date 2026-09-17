/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreSubtechniqueSummary } from '@kbn/security-mitre-attack-common';
import { hasSubtechniqueOptions, sortMitreEntitiesByName } from './helpers';

const makeSubtechnique = (id: string, technique_id: string): MitreSubtechniqueSummary => ({
  type: 'subtechnique',
  framework: 'enterprise',
  framework_version: '16.1',
  id,
  name: `Subtechnique ${id}`,
  reference: `https://attack.mitre.org/techniques/${id}/`,
  tactic_ids: [],
  technique_id,
  revoked: false,
  deprecated: false,
});

describe('helpers', () => {
  describe('hasSubtechniqueOptions', () => {
    describe('when technique has subtechnique options', () => {
      const technique = {
        reference: 'https://attack.mitre.org/techniques/T1003/',
        name: 'OS Credential Dumping',
        id: 'T1003',
        subtechnique: [],
      };
      const subtechniques = [makeSubtechnique('T1003.008', 'T1003')];
      it('returns true', () => {
        expect(hasSubtechniqueOptions(technique, subtechniques)).toBe(true);
      });
    });

    describe('when technique has no subtechnique options', () => {
      const technique = {
        reference: 'https://test.com',
        name: 'Mock technique with no subtechniques',
        id: 'T0000',
        subtechnique: [],
      };
      const subtechniques = [makeSubtechnique('T1003.008', 'T1003')];
      it('returns false', () => {
        expect(hasSubtechniqueOptions(technique, subtechniques)).toBe(false);
      });
    });

    describe('when subtechniques array is empty', () => {
      const technique = {
        reference: 'https://attack.mitre.org/techniques/T1003/',
        name: 'OS Credential Dumping',
        id: 'T1003',
        subtechnique: [],
      };
      it('returns false', () => {
        expect(hasSubtechniqueOptions(technique, [])).toBe(false);
      });
    });
  });

  describe('sortMitreEntitiesByName', () => {
    it('sorts entities alphabetically by name', () => {
      const entities = [
        { name: 'Zulu', id: 'Z1' },
        { name: 'Alpha', id: 'A1' },
        { name: 'Mike', id: 'M1' },
      ];
      const sorted = sortMitreEntitiesByName(entities);
      expect(sorted.map((e) => e.name)).toEqual(['Alpha', 'Mike', 'Zulu']);
    });

    it('does not mutate the input array', () => {
      const entities = [
        { name: 'Bravo', id: 'B1' },
        { name: 'Alpha', id: 'A1' },
      ];
      const originalOrder = entities.map((e) => e.name);
      sortMitreEntitiesByName(entities);
      expect(entities.map((e) => e.name)).toEqual(originalOrder);
    });

    it('returns an empty array when given an empty array', () => {
      expect(sortMitreEntitiesByName([])).toEqual([]);
    });
  });
});
