/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeParentLinks } from './scoring';
import type { AliasMap } from './alias_utils';
import type { ScoringConfig } from './types';

const defaultScoring: ScoringConfig = {
  minEntityScore: 2,
  entityFieldScores: new Map(),
  defaultScorePerField: 1,
};

/**
 * Helper: indexes an alert's entities into the entity-to-alertIds lookup map.
 */
const indexAlert = (
  entityToAlertIds: Map<string, Set<string>>,
  alertId: string,
  entities: Map<string, Set<string>>
) => {
  for (const [field, values] of entities.entries()) {
    for (const v of values) {
      const key = `${field}\u0000${v}`;
      const set = entityToAlertIds.get(key) ?? new Set<string>();
      set.add(alertId);
      entityToAlertIds.set(key, set);
    }
  }
};

describe('scoring', () => {
  describe('computeParentLinks', () => {
    it('returns empty map when no entities match any parent', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(entityToAlertIds, 'parent-1', new Map([['host.name', new Set(['h1'])]]));

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        childEntities: new Map([['host.name', new Set(['h2'])]]),
        aliasesByField: new Map(),
        scoring: defaultScoring,
      });

      expect(result.size).toBe(0);
    });

    it('returns empty map when score is below threshold', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(entityToAlertIds, 'parent-1', new Map([['host.name', new Set(['h1'])]]));

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        childEntities: new Map([['host.name', new Set(['h1'])]]),
        aliasesByField: new Map(),
        scoring: { ...defaultScoring, minEntityScore: 5 },
      });

      expect(result.size).toBe(0);
    });

    it('links parent when score meets threshold', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(
        entityToAlertIds,
        'parent-1',
        new Map([
          ['host.name', new Set(['h1'])],
          ['user.name', new Set(['u1'])],
        ])
      );

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        childEntities: new Map([
          ['host.name', new Set(['h1'])],
          ['user.name', new Set(['u1'])],
        ]),
        aliasesByField: new Map(),
        scoring: { ...defaultScoring, minEntityScore: 2 },
      });

      expect(result.size).toBe(1);
      expect(result.get('parent-1')?.score).toBe(2);
      expect(result.get('parent-1')?.labelScores.get('host')).toBe(1);
      expect(result.get('parent-1')?.labelScores.get('user')).toBe(1);
    });

    it('uses per-field score overrides', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(entityToAlertIds, 'parent-1', new Map([['process.entity_id', new Set(['p1'])]]));

      const scoring: ScoringConfig = {
        minEntityScore: 4,
        entityFieldScores: new Map([['process.entity_id', 5]]),
        defaultScorePerField: 1,
      };

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        childEntities: new Map([['process.entity_id', new Set(['p1'])]]),
        aliasesByField: new Map(),
        scoring,
      });

      expect(result.size).toBe(1);
      expect(result.get('parent-1')?.score).toBe(5);
    });

    it('ignores alerts that are not in parentCandidates', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(
        entityToAlertIds,
        'not-a-candidate',
        new Map([
          ['host.name', new Set(['h1'])],
          ['user.name', new Set(['u1'])],
        ])
      );

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['some-other-id']),
        childEntities: new Map([
          ['host.name', new Set(['h1'])],
          ['user.name', new Set(['u1'])],
        ]),
        aliasesByField: new Map(),
        scoring: defaultScoring,
      });

      expect(result.size).toBe(0);
    });

    it('matches via alias fields', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      // Parent has destination.ip = 10.0.0.1
      indexAlert(
        entityToAlertIds,
        'parent-1',
        new Map([['destination.ip', new Set(['10.0.0.1'])]])
      );

      const aliasesByField: AliasMap = new Map([
        ['source.ip', [{ field: 'destination.ip', score: 3 }]],
      ]);

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        // Child has source.ip = 10.0.0.1, which aliases to destination.ip
        childEntities: new Map([['source.ip', new Set(['10.0.0.1'])]]),
        aliasesByField,
        scoring: { ...defaultScoring, minEntityScore: 3 },
      });

      expect(result.size).toBe(1);
      expect(result.get('parent-1')?.score).toBe(3);
    });

    it('takes max score when multiple fields match the same label', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      indexAlert(
        entityToAlertIds,
        'parent-1',
        new Map([
          ['user.name', new Set(['u1'])],
          ['user.id', new Set(['uid-1'])],
        ])
      );

      const scoring: ScoringConfig = {
        minEntityScore: 1,
        entityFieldScores: new Map([
          ['user.name', 2],
          ['user.id', 3],
        ]),
        defaultScorePerField: 1,
      };

      const result = computeParentLinks({
        entityToAlertIds,
        parentCandidates: new Set(['parent-1']),
        childEntities: new Map([
          ['user.name', new Set(['u1'])],
          ['user.id', new Set(['uid-1'])],
        ]),
        aliasesByField: new Map(),
        scoring,
      });

      expect(result.size).toBe(1);
      // Both user.name and user.id share the "user" label; max(2, 3) = 3
      expect(result.get('parent-1')?.labelScores.get('user')).toBe(3);
      expect(result.get('parent-1')?.score).toBe(3);
    });
  });
});
