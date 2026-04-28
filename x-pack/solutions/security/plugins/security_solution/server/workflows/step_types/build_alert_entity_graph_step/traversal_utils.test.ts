/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntities, indexEntitiesForAlert, addTraversalEdges } from './traversal_utils';
import type { EdgeAccumulator } from './types';

describe('traversal_utils', () => {
  describe('mergeEntities', () => {
    it('adds new values to known and returns them as frontier', () => {
      const known = new Map<string, Set<string>>();
      const added = new Map([['host.name', new Set(['h1', 'h2'])]]);

      const frontier = mergeEntities({ known, added, maxEntitiesPerField: 10 });

      expect(known.get('host.name')).toEqual(new Set(['h1', 'h2']));
      expect(frontier.get('host.name')).toEqual(new Set(['h1', 'h2']));
    });

    it('does not return already-known values in the frontier', () => {
      const known = new Map([['host.name', new Set(['h1'])]]);
      const added = new Map([['host.name', new Set(['h1', 'h2'])]]);

      const frontier = mergeEntities({ known, added, maxEntitiesPerField: 10 });

      expect(known.get('host.name')).toEqual(new Set(['h1', 'h2']));
      expect(frontier.get('host.name')).toEqual(new Set(['h2']));
    });

    it('respects maxEntitiesPerField limit', () => {
      const known = new Map([['host.name', new Set(['h1'])]]);
      const added = new Map([['host.name', new Set(['h2', 'h3', 'h4'])]]);

      const frontier = mergeEntities({ known, added, maxEntitiesPerField: 2 });

      expect(known.get('host.name')?.size).toBe(2);
      expect(frontier.get('host.name')?.size).toBe(1);
    });

    it('returns empty frontier when nothing is new', () => {
      const known = new Map([['host.name', new Set(['h1'])]]);
      const added = new Map([['host.name', new Set(['h1'])]]);

      const frontier = mergeEntities({ known, added, maxEntitiesPerField: 10 });

      expect(frontier.size).toBe(0);
    });

    it('skips empty value sets', () => {
      const known = new Map<string, Set<string>>();
      const added = new Map([['host.name', new Set<string>()]]);

      const frontier = mergeEntities({ known, added, maxEntitiesPerField: 10 });

      expect(frontier.size).toBe(0);
    });
  });

  describe('indexEntitiesForAlert', () => {
    it('creates entries keyed by field+value', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      const entities = new Map([['host.name', new Set(['h1'])]]);

      indexEntitiesForAlert({ entityToAlertIds, alertId: 'a1', entities });

      const key = 'host.name\u0000h1';
      expect(entityToAlertIds.get(key)).toEqual(new Set(['a1']));
    });

    it('accumulates multiple alert IDs for the same entity value', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      const entities = new Map([['host.name', new Set(['h1'])]]);

      indexEntitiesForAlert({ entityToAlertIds, alertId: 'a1', entities });
      indexEntitiesForAlert({ entityToAlertIds, alertId: 'a2', entities });

      const key = 'host.name\u0000h1';
      expect(entityToAlertIds.get(key)).toEqual(new Set(['a1', 'a2']));
    });

    it('indexes multiple fields and values', () => {
      const entityToAlertIds = new Map<string, Set<string>>();
      const entities = new Map([
        ['host.name', new Set(['h1', 'h2'])],
        ['user.name', new Set(['u1'])],
      ]);

      indexEntitiesForAlert({ entityToAlertIds, alertId: 'a1', entities });

      expect(entityToAlertIds.size).toBe(3);
      expect(entityToAlertIds.get('host.name\u0000h1')).toEqual(new Set(['a1']));
      expect(entityToAlertIds.get('host.name\u0000h2')).toEqual(new Set(['a1']));
      expect(entityToAlertIds.get('user.name\u0000u1')).toEqual(new Set(['a1']));
    });
  });

  describe('addTraversalEdges', () => {
    it('creates a new edge when none exists', () => {
      const edgesByKey: EdgeAccumulator = new Map();
      const parentLinks = new Map([
        [
          'parent-1',
          {
            labels: new Set(['host']),
            labelScores: new Map([['host', 2]]),
            score: 2,
          },
        ],
      ]);

      addTraversalEdges({ edgesByKey, childId: 'child-1', parentLinks });

      expect(edgesByKey.size).toBe(1);
      const edge = Array.from(edgesByKey.values())[0];
      expect(edge.from).toBe('parent-1');
      expect(edge.to).toBe('child-1');
      expect(edge.score).toBe(2);
      expect(edge.labelScores.get('host')).toBe(2);
    });

    it('merges scores when edge already exists (takes max per label)', () => {
      const edgesByKey: EdgeAccumulator = new Map();

      // First traversal finds host match with score 2
      addTraversalEdges({
        edgesByKey,
        childId: 'child-1',
        parentLinks: new Map([
          [
            'parent-1',
            {
              labels: new Set(['host']),
              labelScores: new Map([['host', 2]]),
              score: 2,
            },
          ],
        ]),
      });

      // Second traversal finds host match with score 3 and user match with score 1
      addTraversalEdges({
        edgesByKey,
        childId: 'child-1',
        parentLinks: new Map([
          [
            'parent-1',
            {
              labels: new Set(['host', 'user']),
              labelScores: new Map([
                ['host', 3],
                ['user', 1],
              ]),
              score: 4,
            },
          ],
        ]),
      });

      expect(edgesByKey.size).toBe(1);
      const edge = Array.from(edgesByKey.values())[0];
      expect(edge.labelScores.get('host')).toBe(3); // max(2, 3)
      expect(edge.labelScores.get('user')).toBe(1);
      expect(edge.score).toBe(4); // 3 + 1
    });

    it('creates edges for multiple parents', () => {
      const edgesByKey: EdgeAccumulator = new Map();
      const parentLinks = new Map([
        [
          'parent-1',
          {
            labels: new Set(['host']),
            labelScores: new Map([['host', 2]]),
            score: 2,
          },
        ],
        [
          'parent-2',
          {
            labels: new Set(['user']),
            labelScores: new Map([['user', 3]]),
            score: 3,
          },
        ],
      ]);

      addTraversalEdges({ edgesByKey, childId: 'child-1', parentLinks });

      expect(edgesByKey.size).toBe(2);
    });
  });
});
