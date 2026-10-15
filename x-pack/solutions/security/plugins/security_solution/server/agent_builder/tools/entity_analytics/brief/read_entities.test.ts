/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './types';
import { foldAliases, rankCandidates, selectCandidateTiles } from './read_entities';

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
  resolution?: { resolved_to?: string; risk?: { calculated_score_norm: number } }
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

describe('foldAliases', () => {
  const alias = (id: string, tileIds: SignalCardId[], goldenId: string) =>
    candidate(id, tileIds, 10, { resolved_to: goldenId });

  it.each<
    [string, BriefCandidate[], Array<[id: string, recordId: string, tileIds: SignalCardId[]]>]
  >([
    [
      'merges an alias into its golden entity and keeps the golden record',
      [alias('user:alias', ['newEntity'], 'user:gold'), candidate('user:gold', ['riskMovers'])],
      [['user:gold', 'user:gold', ['riskMovers', 'newEntity']]],
    ],
    [
      'stands an alias in for a golden entity that was not read',
      [
        alias('user:a1', ['newEntity'], 'user:gold'),
        alias('user:a2', ['entitiesWithAlerts'], 'user:gold'),
      ],
      [['user:gold', 'user:a1', ['entitiesWithAlerts', 'newEntity']]],
    ],
    [
      'merges tiles in the page order',
      [candidate('user:gold', ['newEntity']), alias('user:a', ['entitiesWithAlerts'], 'user:gold')],
      [['user:gold', 'user:gold', ['entitiesWithAlerts', 'newEntity']]],
    ],
    [
      'leaves unrelated entities alone',
      [candidate('host:x', ['riskMovers']), candidate('host:y', ['riskMovers'])],
      [
        ['host:x', 'host:x', ['riskMovers']],
        ['host:y', 'host:y', ['riskMovers']],
      ],
    ],
  ])('%s', (_name, candidates, expected) => {
    expect(
      foldAliases(candidates).map(({ id, record, tileIds }) => [id, record.entity?.id, tileIds])
    ).toEqual(expected);
  });
});
