/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefTileId,
  EntityAnalyticsScope,
} from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './brief_types';
import { rankCandidates, selectCandidateTiles } from './select_candidates';

const scopeWith = (
  tiles: EntityAnalyticsScope['tiles'],
  focusTileId?: BriefTileId
): EntityAnalyticsScope => ({
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles,
  focusTileId,
});

const candidate = (id: string, tileIds: BriefTileId[], score?: number): BriefCandidate => ({
  id,
  name: id,
  type: 'host',
  tileIds,
  record: { entity: { id, risk: { calculated_score_norm: score } } },
});

describe('selectCandidateTiles', () => {
  it.each<[string, EntityAnalyticsScope, Record<string, BriefTileId[]>]>([
    [
      'collects tiles per entity in tile order',
      scopeWith({
        watchlisted: { value: 1, entityIds: ['a'] },
        entitiesWithAlerts: { value: 2, entityIds: ['a', 'b'] },
      }),
      { a: ['entitiesWithAlerts', 'watchlisted'], b: ['entitiesWithAlerts'] },
    ],
    [
      'puts the selected tile first',
      scopeWith(
        {
          entitiesWithAlerts: { value: 1, entityIds: ['a'] },
          riskMovers: { value: 1, entityIds: ['a'] },
        },
        'riskMovers'
      ),
      { a: ['riskMovers', 'entitiesWithAlerts'] },
    ],
    [
      'skips unavailable tiles',
      scopeWith({
        riskMovers: { value: 0, unavailable: true, entityIds: ['a'] },
        newEntity: { value: 1, entityIds: ['b'] },
      }),
      { b: ['newEntity'] },
    ],
  ])('%s', (_name, scope, expected) => {
    expect(Object.fromEntries(selectCandidateTiles(scope))).toEqual(expected);
  });
});

describe('rankCandidates', () => {
  it.each<[string, BriefCandidate[], BriefTileId | undefined, string[]]>([
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
  ])('%s', (_name, candidates, focusTileId, expected) => {
    expect(rankCandidates(candidates, focusTileId).map(({ id }) => id)).toEqual(expected);
  });

  it('caps the candidates', () => {
    const many = Array.from({ length: 30 }, (_, index) => candidate(`e${index}`, ['newEntity']));
    expect(rankCandidates(many, undefined)).toHaveLength(25);
  });
});
