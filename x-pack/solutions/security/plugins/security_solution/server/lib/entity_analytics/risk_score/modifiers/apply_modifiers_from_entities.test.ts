/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityLevel } from '@kbn/entity-store/common';
import type { RiskScoreModifierEntity } from '../maintainer/steps/pipeline_types';

import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { ParsedRiskScore } from '../maintainer/steps/parse_esql_row';
import {
  extractModifiersFromEntity,
  applyScoreModifiersFromEntities,
} from './apply_modifiers_from_entities';

const buildTestEntity = ({
  id,
  criticality,
  watchlists,
}: {
  id: string;
  criticality?: AssetCriticalityLevel;
  watchlists?: string[];
}): RiskScoreModifierEntity => ({
  entity: {
    id,
    ...(watchlists?.length ? { attributes: { watchlists } } : {}),
  },
  ...(criticality ? { asset: { criticality } } : {}),
});

const buildScore = (entityId: string, overrides?: Partial<ParsedRiskScore>): ParsedRiskScore => ({
  entity_id: entityId,
  alert_count: 1,
  score: 85,
  normalized_score: 75,
  risk_inputs: [
    {
      id: 'alert-1',
      index: '.alerts-security',
      rule_name: 'Test Rule',
      time: '2024-01-01T00:00:00.000Z',
      score: 50,
      contribution: 25,
    },
  ],
  ...overrides,
});

const buildWatchlistConfigs = (
  ...entries: Array<{ id: string; name: string; riskModifier: number }>
): Map<string, WatchlistObject> =>
  new Map(
    entries.map(({ id, name, riskModifier }) => [id, { id, name, managed: false, riskModifier }])
  );

const defaultWatchlistConfigs = buildWatchlistConfigs({
  id: 'wl-1',
  name: 'privmon',
  riskModifier: 1.5,
});

describe('extractModifiersFromEntity', () => {
  describe('criticality modifier', () => {
    it.each<[AssetCriticalityLevel, number]>([
      ['low_impact', 0.5],
      ['medium_impact', 1.0],
      ['high_impact', 1.5],
      ['extreme_impact', 2.0],
    ])('maps %s criticality to modifier value %s', (level, expected) => {
      const entity = buildTestEntity({ id: 'host:h1', criticality: level });
      const [crit] = extractModifiersFromEntity(entity);
      expect(crit).toEqual({
        type: 'asset_criticality',
        modifier_value: expected,
        metadata: { criticality_level: level },
      });
    });

    it('returns undefined when entity has no criticality', () => {
      const entity = buildTestEntity({ id: 'host:h1' });
      const [crit] = extractModifiersFromEntity(entity);
      expect(crit).toBeUndefined();
    });

    it('applies globalWeight to criticality modifier', () => {
      const entity = buildTestEntity({ id: 'host:h1', criticality: 'high_impact' });
      const [crit] = extractModifiersFromEntity(entity, 0.5);
      expect(crit?.modifier_value).toBe(0.75); // 1.5 * 0.5
    });
  });

  describe('watchlist modifier', () => {
    it('returns watchlist modifier when entity has a matching watchlist ID', () => {
      const entity = buildTestEntity({ id: 'user:u1', watchlists: ['wl-1'] });
      const [, watchlistMods] = extractModifiersFromEntity(
        entity,
        undefined,
        defaultWatchlistConfigs
      );
      expect(watchlistMods).toEqual([
        {
          type: 'watchlist',
          subtype: 'privmon',
          modifier_value: 1.5,
          metadata: { watchlist_id: 'wl-1', is_privileged_user: true },
        },
      ]);
    });

    it('returns multiple watchlist modifiers when entity belongs to multiple watchlists', () => {
      const configs = buildWatchlistConfigs(
        { id: 'wl-1', name: 'privmon', riskModifier: 1.5 },
        { id: 'wl-2', name: 'vip', riskModifier: 2.0 }
      );
      const entity = buildTestEntity({ id: 'user:u1', watchlists: ['wl-1', 'wl-2'] });
      const [, watchlistMods] = extractModifiersFromEntity(entity, undefined, configs);
      expect(watchlistMods).toHaveLength(2);
      expect(watchlistMods[0]).toMatchObject({
        subtype: 'privmon',
        modifier_value: 1.5,
        metadata: { watchlist_id: 'wl-1', is_privileged_user: true },
      });
      expect(watchlistMods[1]).toMatchObject({
        subtype: 'vip',
        modifier_value: 2.0,
        metadata: { watchlist_id: 'wl-2' },
      });
    });

    it.each([
      {
        name: 'watchlists array is empty',
        entity: buildTestEntity({ id: 'user:u1', watchlists: [] }),
      },
      {
        name: 'entity has no attributes',
        entity: buildTestEntity({ id: 'user:u1' }),
      },
      {
        name: 'watchlist ID is not in configs',
        entity: buildTestEntity({ id: 'user:u1', watchlists: ['unknown-id'] }),
      },
    ])('returns empty array when $name', ({ entity }) => {
      const [, watchlistMods] = extractModifiersFromEntity(
        entity,
        undefined,
        defaultWatchlistConfigs
      );
      expect(watchlistMods).toEqual([]);
    });

    it('applies globalWeight to watchlist modifier', () => {
      const entity = buildTestEntity({ id: 'user:u1', watchlists: ['wl-1'] });
      const [, watchlistMods] = extractModifiersFromEntity(entity, 0.5, defaultWatchlistConfigs);
      expect(watchlistMods).toHaveLength(1);
      expect(watchlistMods[0].modifier_value).toBe(0.75); // 1.5 * 0.5
    });
  });

  describe('combined modifiers', () => {
    it('returns both modifiers when entity has both criticality and watchlists', () => {
      const entity = buildTestEntity({
        id: 'user:u1',
        criticality: 'extreme_impact',
        watchlists: ['wl-1'],
      });
      const [crit, watchlistMods] = extractModifiersFromEntity(
        entity,
        undefined,
        defaultWatchlistConfigs
      );
      expect(crit).toBeDefined();
      expect(crit?.modifier_value).toBe(2.0);
      expect(watchlistMods).toHaveLength(1);
      expect(watchlistMods[0].modifier_value).toBe(1.5);
    });

    it('returns [undefined, []] when entity has neither', () => {
      const entity = buildTestEntity({ id: 'user:u1' });
      const [crit, watchlistMods] = extractModifiersFromEntity(
        entity,
        undefined,
        defaultWatchlistConfigs
      );
      expect(crit).toBeUndefined();
      expect(watchlistMods).toEqual([]);
    });
  });

  it('returns [undefined, []] when entity is undefined', () => {
    const [crit, watchlistMods] = extractModifiersFromEntity(undefined);
    expect(crit).toBeUndefined();
    expect(watchlistMods).toEqual([]);
  });
});

describe('applyScoreModifiersFromEntities', () => {
  const identifierField = 'entity.id';
  const now = '2024-01-01T00:00:00.000Z';

  it('applies criticality modifier and produces correct risk score doc', () => {
    const entities = new Map([
      ['host:h1', buildTestEntity({ id: 'host:h1', criticality: 'high_impact' })],
    ]);

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores: [buildScore('host:h1')], identifierField },
      entities,
    });

    expect(results).toHaveLength(1);
    const doc = results[0];
    expect(doc.id_field).toBe(identifierField);
    expect(doc.id_value).toBe('host:h1');
    expect(doc.criticality_level).toBe('high_impact');
    expect(doc.criticality_modifier).toBe(1.5);
    expect(doc.modifiers).toHaveLength(1);
    expect(doc.modifiers?.[0]).toMatchObject({
      type: 'asset_criticality',
      modifier_value: 1.5,
    });
    // Bayesian update increases score
    expect(doc.calculated_score_norm).toBeGreaterThan(75);
  });

  it('applies both modifiers when entity has criticality and watchlists', () => {
    const entities = new Map([
      [
        'user:u1',
        buildTestEntity({ id: 'user:u1', criticality: 'extreme_impact', watchlists: ['wl-1'] }),
      ],
    ]);

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores: [buildScore('user:u1')], identifierField },
      entities,
      watchlistConfigs: defaultWatchlistConfigs,
    });

    expect(results).toHaveLength(1);
    const doc = results[0];
    expect(doc.modifiers).toHaveLength(2);
    expect(doc.modifiers?.map((m) => m.type)).toEqual(
      expect.arrayContaining(['asset_criticality', 'watchlist'])
    );
    // With both modifiers (2.0 * 1.5 = 3.0 total), score should be significantly boosted
    expect(doc.calculated_score_norm).toBeGreaterThan(75);
    expect(doc.criticality_level).toBe('extreme_impact');
    expect(doc.criticality_modifier).toBe(2.0);
  });

  it('returns empty array with empty scores', () => {
    const entities = new Map<string, RiskScoreModifierEntity>();

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores: [], identifierField },
      entities,
    });

    expect(results).toEqual([]);
  });

  it('handles multiple scores with mixed matches', () => {
    const entities = new Map([
      ['host:h1', buildTestEntity({ id: 'host:h1', criticality: 'low_impact' })],
      [
        'host:h3',
        buildTestEntity({ id: 'host:h3', criticality: 'extreme_impact', watchlists: ['wl-1'] }),
      ],
    ]);

    const scores = [
      buildScore('host:h1'),
      buildScore('host:h2'), // not in entity map
      buildScore('host:h3'),
    ];

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores, identifierField },
      entities,
      watchlistConfigs: defaultWatchlistConfigs,
    });

    expect(results).toHaveLength(3);

    // h1: only criticality
    expect(results[0].modifiers).toHaveLength(1);
    expect(results[0].modifiers?.[0].type).toBe('asset_criticality');

    // h2: no entity → no modifiers
    expect(results[1].modifiers).toEqual([]);

    // h3: both modifiers
    expect(results[2].modifiers).toHaveLength(2);
  });

  it('sets correct @timestamp and id fields', () => {
    const entities = new Map([['host:h1', buildTestEntity({ id: 'host:h1' })]]);

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores: [buildScore('host:h1')], identifierField },
      entities,
    });

    expect(results[0]['@timestamp']).toBe(now);
    expect(results[0].id_field).toBe(identifierField);
    expect(results[0].id_value).toBe('host:h1');
  });

  it.each([
    { scoreType: undefined, expected: 'base' },
    { scoreType: 'propagated' as const, expected: 'propagated' },
  ])('sets score_type to $expected', ({ scoreType, expected }) => {
    const entities = new Map([['host:h1', buildTestEntity({ id: 'host:h1' })]]);

    const results = applyScoreModifiersFromEntities({
      now,
      scoreType,
      page: { scores: [buildScore('host:h1')], identifierField },
      entities,
    });

    expect(results[0].score_type).toBe(expected);
  });

  it('sets calculation_run_id when provided', () => {
    const entities = new Map([['host:h1', buildTestEntity({ id: 'host:h1' })]]);

    const results = applyScoreModifiersFromEntities({
      now,
      calculationRunId: 'run-id-1',
      page: { scores: [buildScore('host:h1')], identifierField },
      entities,
    });

    expect(results[0].calculation_run_id).toBe('run-id-1');
  });

  it('includes modifier contributions that sum to total score change', () => {
    const entities = new Map([
      [
        'user:u1',
        buildTestEntity({ id: 'user:u1', criticality: 'high_impact', watchlists: ['wl-1'] }),
      ],
    ]);

    const results = applyScoreModifiersFromEntities({
      now,
      page: { scores: [buildScore('user:u1')], identifierField },
      entities,
      watchlistConfigs: defaultWatchlistConfigs,
    });

    const doc = results[0];
    const contributions = doc.modifiers?.map((m) => m.contribution) ?? [];
    expect(contributions).toHaveLength(2);
    contributions.forEach((c) => {
      expect(typeof c).toBe('number');
    });
    // Contributions should sum approximately to the total score change
    const totalContribution = contributions.reduce((sum, c) => sum + c, 0);
    const baseScore = 75; // normalized_score from the bucket
    const scoreChange = doc.calculated_score_norm - baseScore;
    expect(totalContribution).toBeCloseTo(scoreChange, 5);
  });
});
