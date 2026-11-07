/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityRow } from './types';
import {
  buildAttentionTiles,
  buildPulseTiles,
  dailyActiveSeriesFromCounts,
  windowDays,
} from './kpi_model';

const NOW = new Date('2026-07-17T14:45:00Z').getTime();

const makeRow = (overrides: Partial<EntityRow> = {}): EntityRow =>
  ({
    base: {
      id: 'user:test',
      name: 'test',
      type: EntityType.user,
      identifierValue: 'test',
      riskScoreNorm: 50,
      riskLevel: 'Moderate',
      criticality: undefined,
      source: undefined,
      lastSeen: undefined,
    },
    identifierValue: 'test',
    type: EntityType.user,
    isService: false,
    risk: 50,
    level: 'Moderate',
    criticality: undefined,
    alerts: 0,
    uncased: 0,
    ruleNames: [],
    newRules: [],
    anoms: 0,
    attacks: 0,
    cases: 0,
    watchlists: [],
    identities: [],
    firstSeen: undefined,
    lastSeen: undefined,
    lastAlert: undefined,
    firstHighAt: undefined,
    deltas: {
      w1: { alerts: 0, risk: 0, anoms: 0 },
      w7: { alerts: 0, risk: 0, anoms: 0 },
      w30: { alerts: 0, risk: 0, anoms: 0 },
    },
    caseIds: [],
    attackIds: [],
    ...overrides,
  } as EntityRow);

describe('kpi_model', () => {
  const rows = [
    makeRow({ risk: 95, cases: 0, watchlists: ['w'], alerts: 5, anoms: 2 }),
    makeRow({ risk: 72, cases: 1, alerts: 3 }),
    makeRow({ risk: 30, firstSeen: NOW - 1000, alerts: 1 }),
    makeRow({ risk: 10, anoms: 4 }),
  ];

  describe('buildAttentionTiles', () => {
    it('produces the six triage tiles with real counts', () => {
      const tiles = buildAttentionTiles(rows, 'w1', NOW);
      expect(tiles.map((t) => t.key)).toEqual([
        'highrisk',
        'untriaged',
        'firsthigh',
        'newrule',
        'newalerted',
        'watchlisted',
      ]);
      const byKey = Object.fromEntries(tiles.map((t) => [t.key, t.value]));
      expect(byKey.highrisk).toBe(2);
      expect(byKey.untriaged).toBe(1);
      expect(byKey.newalerted).toBe(1);
      expect(byKey.watchlisted).toBe(1);
      expect(tiles.every((t) => t.attention)).toBe(true);
      expect(tiles.every((t) => t.filterKey !== null)).toBe(true);
    });
    it('leaves deltas undefined without a prior snapshot', () => {
      const tiles = buildAttentionTiles(rows, 'w1', NOW);
      expect(tiles.every((t) => t.delta === undefined)).toBe(true);
    });
    it('computes deltas from a prior snapshot', () => {
      const prev = [makeRow({ risk: 95 })]; // only 1 high-risk previously
      const tiles = buildAttentionTiles(rows, 'w1', NOW, prev);
      const highrisk = tiles.find((t) => t.key === 'highrisk');
      expect(highrisk?.delta).toBe(1); // 2 now - 1 prev
    });
  });

  describe('buildPulseTiles', () => {
    it('derives real counts and marks pulse tiles', () => {
      const tiles = buildPulseTiles(rows, 'w1', NOW, undefined);
      const byKey = Object.fromEntries(tiles.map((t) => [t.key, t.value]));
      expect(byKey['new-entities']).toBe(1);
      expect(byKey['entities-with-alerts']).toBe(3);
      expect(byKey['entities-with-anomalies']).toBe(2);
      expect(tiles.every((t) => !t.attention)).toBe(true);
      expect(tiles.every((t) => t.filterKey === null)).toBe(true);
    });
    it('uses a real daily-active series when supplied', () => {
      const series = [2400, 2500, 2600, 2842];
      const tiles = buildPulseTiles(rows, 'w1', NOW, series);
      const active = tiles.find((t) => t.key === 'daily-active');
      expect(active?.value).toBe(2842);
      expect(active?.delta).toBe(2842 - 2600);
      expect(active?.series).toEqual(series);
    });
    it('leaves daily-active delta undefined without a series', () => {
      const tiles = buildPulseTiles(rows, 'w1', NOW, undefined);
      const active = tiles.find((t) => t.key === 'daily-active');
      expect(active?.value).toBeUndefined();
      expect(active?.delta).toBeUndefined();
      expect(active?.series).toBeUndefined();
    });
  });

  it('renders affected attention and pulse metrics unknown when evidence failed', () => {
    const incomplete = [
      makeRow({
        risk: 90,
        evidence: {
          cases: 'unavailable',
          alerts: 'ambiguous',
          anomalies: 'partial',
          riskHistory: 'unavailable',
        },
      }),
    ];
    const attention = Object.fromEntries(
      buildAttentionTiles(incomplete, 'w1', NOW).map((tile) => [tile.key, tile.value])
    );
    const pulse = Object.fromEntries(
      buildPulseTiles(incomplete, 'w1', NOW, undefined).map((tile) => [tile.key, tile.value])
    );
    expect(attention.highrisk).toBe(1);
    expect(attention.untriaged).toBeUndefined();
    expect(attention.newalerted).toBeUndefined();
    expect(attention.firsthigh).toBeUndefined();
    expect(pulse['entities-with-alerts']).toBeUndefined();
    expect(pulse['entities-with-anomalies']).toBeUndefined();
  });

  describe('dailyActiveSeriesFromCounts', () => {
    it('requires at least two points', () => {
      expect(dailyActiveSeriesFromCounts([5])).toBeUndefined();
      expect(dailyActiveSeriesFromCounts([5, 6])).toEqual([5, 6]);
    });
  });

  describe('windowDays', () => {
    it('maps windows to day counts', () => {
      expect(windowDays('w1')).toBe(1);
      expect(windowDays('w7')).toBe(7);
      expect(windowDays('w30')).toBe(30);
    });
  });
});
