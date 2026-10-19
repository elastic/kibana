/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './types';
import { rankCandidates, selectCandidateTiles, withGroupValues } from './read_entities';

const scopeWith = (
  tiles: EntityAnalyticsScope['tiles'],
  focusTileId?: SignalCardId
): EntityAnalyticsScope => ({
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles,
  focusTileId,
});

const candidate = (
  id: string,
  tileIds: SignalCardId[],
  score?: number,
  resolution?: { risk?: { calculated_score_norm: number } }
): BriefCandidate => ({
  id,
  name: id,
  type: 'host',
  tileIds,
  record: {
    entity: { id, risk: { calculated_score_norm: score }, relationships: { resolution } },
  },
});

describe('selectCandidateTiles', () => {
  it.each<[string, EntityAnalyticsScope, Record<string, SignalCardId[]>]>([
    [
      'collects tiles per entity in tile order',
      scopeWith({
        watchlisted: { title: 'Watchlisted', value: 1, entityIds: ['a'] },
        entitiesWithAlerts: { title: 'Entities with alerts', value: 2, entityIds: ['a', 'b'] },
      }),
      { a: ['entitiesWithAlerts', 'watchlisted'], b: ['entitiesWithAlerts'] },
    ],
    [
      'lists tiles in the page order',
      scopeWith({
        entitiesWithAlerts: { title: 'Entities with alerts', value: 1, entityIds: ['a'] },
        riskMovers: { title: 'Risk movers', value: 1, entityIds: ['a'] },
      }),
      { a: ['entitiesWithAlerts', 'riskMovers'] },
    ],
    [
      'skips unavailable tiles',
      scopeWith({
        riskMovers: { title: 'Risk movers', value: 0, unavailable: true, entityIds: ['a'] },
        newEntity: { title: 'New entity', value: 1, entityIds: ['b'] },
      }),
      { b: ['newEntity'] },
    ],
  ])('%s', (_name, scope, expected) => {
    expect(Object.fromEntries(selectCandidateTiles(scope))).toEqual(expected);
  });
});

describe('rankCandidates', () => {
  it.each<[string, BriefCandidate[], SignalCardId | undefined, string[]]>([
    [
      'ranks selected tile membership above tile count',
      [
        candidate('many', ['entitiesWithAlerts', 'watchlisted']),
        candidate('focus', ['riskMovers']),
      ],
      'riskMovers',
      ['focus', 'many'],
    ],
    [
      'ranks tile count above risk',
      [candidate('risky', ['riskMovers'], 95), candidate('many', ['riskMovers', 'newEntity'], 10)],
      undefined,
      ['many', 'risky'],
    ],
    [
      'ranks by risk, unscored last',
      [
        candidate('none', ['riskMovers']),
        candidate('low', ['riskMovers'], 20),
        candidate('high', ['riskMovers'], 80),
      ],
      undefined,
      ['high', 'low', 'none'],
    ],
    [
      'ranks on resolution group risk when scored',
      [
        candidate('own', ['riskMovers'], 80),
        candidate('group', ['riskMovers'], 20, { risk: { calculated_score_norm: 90 } }),
      ],
      undefined,
      ['group', 'own'],
    ],
  ])('%s', (_name, candidates, focusTileId, expected) => {
    expect(rankCandidates(candidates, focusTileId).map(({ id }) => id)).toEqual(expected);
  });
});

describe('withGroupValues', () => {
  it('gives the golden entity its group values, as the page does', () => {
    const golden = candidate('user:gold', ['watchlisted']);
    const { record } = withGroupValues(
      {
        ...golden,
        record: {
          ...golden.record,
          asset: { criticality: 'low_impact' },
          entity: {
            ...golden.record.entity,
            lifecycle: { first_seen: '2026-10-10T00:00:00.000Z' },
          },
        },
      },
      [
        {
          entity: { id: 'user:a1', attributes: { watchlists: ['privileged'] } },
          asset: { criticality: 'high_impact' },
        },
        { entity: { id: 'user:a2', lifecycle: { first_seen: '2026-10-01T00:00:00.000Z' } } },
      ]
    );
    expect(record.asset?.criticality).toBe('high_impact');
    expect(record.entity?.attributes?.watchlists).toEqual(['privileged']);
    expect(record.entity?.lifecycle?.first_seen).toBe('2026-10-01T00:00:00.000Z');
  });
});
