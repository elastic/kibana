/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  baselineScoreAt,
  buildResolutionIdentities,
  extractAttackEntities,
  extractEntityPrimitives,
  firstHighFromHistory,
  normalizeEntityKey,
  riskDeltasFromHistory,
  type RiskHistoryPoint,
} from './enrichment';
import { DAY_MS } from './entities_logic';

const NOW = new Date('2026-07-17T14:45:00Z').getTime();

const points = (pairs: Array<[number, number]>): RiskHistoryPoint[] =>
  pairs.map(([daysAgo, scoreNorm]) => ({ timestamp: NOW - daysAgo * DAY_MS, scoreNorm }));

describe('enrichment', () => {
  describe('baselineScoreAt', () => {
    it('returns undefined for empty history', () => {
      expect(baselineScoreAt([], NOW - DAY_MS)).toBeUndefined();
    });
    it('picks the latest point at/under the boundary', () => {
      const series = points([
        [10, 40],
        [5, 55],
        [1, 70],
      ]);
      expect(baselineScoreAt(series, NOW - 7 * DAY_MS)).toBe(40);
      expect(baselineScoreAt(series, NOW - 2 * DAY_MS)).toBe(55);
    });
    it('falls back to earliest when history starts after the boundary', () => {
      const series = points([
        [3, 60],
        [1, 65],
      ]);
      expect(baselineScoreAt(series, NOW - 30 * DAY_MS)).toBe(60);
    });
  });

  describe('riskDeltasFromHistory', () => {
    it('computes rounded per-window deltas vs current', () => {
      const series = points([
        [29, 20],
        [6, 50],
        [0.5, 68],
      ]);
      const deltas = riskDeltasFromHistory(series, 75, NOW);
      // Boundaries: w1 = NOW-1d (baseline = latest point <= that = 50 @6d),
      // w7 = NOW-7d (baseline = 20 @29d), w30 = NOW-30d (earliest fallback = 20).
      expect(deltas.w1).toBe(25);
      expect(deltas.w7).toBe(55);
      expect(deltas.w30).toBe(55);
    });
    it('is flat (0) with no history — never fabricated', () => {
      const deltas = riskDeltasFromHistory([], 80, NOW);
      expect(deltas).toEqual({ w1: 0, w7: 0, w30: 0 });
    });
    it('reflects falling risk', () => {
      const series = points([
        [2, 90],
        [0.5, 60],
      ]);
      expect(riskDeltasFromHistory(series, 55, NOW).w7).toBeLessThan(0);
    });
  });

  describe('firstHighFromHistory', () => {
    it('finds the first crossing of 70', () => {
      const series = points([
        [10, 40],
        [5, 68],
        [3, 72],
        [1, 80],
      ]);
      expect(firstHighFromHistory(series)).toBe(NOW - 3 * DAY_MS);
    });
    it('returns undefined when never High', () => {
      expect(firstHighFromHistory(points([[5, 50]]))).toBeUndefined();
    });
  });

  describe('extractAttackEntities', () => {
    it('parses replaced host/user tokens from AD markdown', () => {
      const md =
        'Host {{ host.name SRVWIN01 }} and user {{ user.name root }} were involved. ' +
        'Also {{ host.name SRVMAC08 }}.';
      expect(extractAttackEntities(md).sort()).toEqual(['SRVMAC08', 'SRVWIN01', 'root']);
    });
    it('returns empty for undefined / no tokens', () => {
      expect(extractAttackEntities(undefined)).toEqual([]);
      expect(extractAttackEntities('no tokens here')).toEqual([]);
    });
    it('handles service.name tokens', () => {
      expect(extractAttackEntities('{{ service.name svc-backup }}')).toEqual(['svc-backup']);
    });
  });

  describe('normalizeEntityKey', () => {
    it('lowercases and trims', () => {
      expect(normalizeEntityKey('  LAPTOP-FIN03 ')).toBe('laptop-fin03');
    });
  });

  describe('buildResolutionIdentities', () => {
    it('derives identities from sources', () => {
      const ids = buildResolutionIdentities('user:a', ['crowdstrike', 'crowdstrike.fdr'], []);
      expect(ids.map((i) => i.value)).toEqual(['crowdstrike', 'crowdstrike.fdr']);
    });
    it('dedupes sources', () => {
      const ids = buildResolutionIdentities('user:a', ['docker', 'docker'], []);
      expect(ids).toHaveLength(1);
    });
    it('adds resolution-lookup identities that resolve to the entity', () => {
      const ids = buildResolutionIdentities(
        'user:target',
        [],
        [
          {
            entityId: 'user:alias',
            resolutionTargetId: 'user:target',
            propagationTargetId: null,
            relationshipType: 'resolved',
          },
          {
            entityId: 'user:target',
            resolutionTargetId: 'user:target',
            propagationTargetId: null,
            relationshipType: 'self',
          },
        ]
      );
      expect(ids.map((i) => i.value)).toEqual(['user:alias']);
    });
    it('returns empty when nothing resolves', () => {
      expect(buildResolutionIdentities('user:a', [], [])).toEqual([]);
    });
  });

  describe('extractEntityPrimitives', () => {
    it('reads lifecycle timestamps and array source', () => {
      const p = extractEntityPrimitives({
        entity: {
          EngineMetadata: { Type: 'host' },
          source: ['crowdstrike.fdr', 'crowdstrike'],
          lifecycle: {
            first_seen: '2026-07-13T14:26:23.086Z',
            last_seen: '2026-07-13T15:57:23.086Z',
          },
        },
      });
      expect(p.firstSeen).toBe(new Date('2026-07-13T14:26:23.086Z').getTime());
      expect(p.lastSeen).toBe(new Date('2026-07-13T15:57:23.086Z').getTime());
      expect(p.sources).toEqual(['crowdstrike.fdr', 'crowdstrike']);
      expect(p.isService).toBe(false);
    });
    it('handles scalar source and service type', () => {
      const p = extractEntityPrimitives({
        entity: { EngineMetadata: { Type: 'service' }, source: 'docker' },
      });
      expect(p.sources).toEqual(['docker']);
      expect(p.isService).toBe(true);
      expect(p.firstSeen).toBeUndefined();
    });
    it('handles a missing entity object', () => {
      const p = extractEntityPrimitives({});
      expect(p.sources).toEqual([]);
      expect(p.isService).toBe(false);
    });
  });
});
