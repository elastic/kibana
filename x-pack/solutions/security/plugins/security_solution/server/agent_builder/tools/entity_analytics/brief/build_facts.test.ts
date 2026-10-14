/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate, BriefPriority } from './brief_types';
import { buildFacts, getCitedRiskChanges } from './build_facts';

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {},
};

const record = (id: string, score?: number, resolvedTo?: string): Entity => ({
  entity: {
    id,
    name: id.split(':')[1],
    risk: score === undefined ? undefined : { calculated_score_norm: score },
    relationships: resolvedTo ? { resolution: { resolved_to: resolvedTo } } : undefined,
  },
});

const candidate = (entityRecord: Entity): BriefCandidate => ({
  id: 'user:jdoe',
  name: 'jdoe',
  type: 'user',
  tileIds: ['riskMovers'],
  record: entityRecord,
});

const riskChangeFacts = (
  entityRecord: Entity,
  scoresById: Record<string, number>,
  aliases: Entity[] = []
): string[] =>
  buildFacts([candidate(entityRecord)], scope, {
    aliasesById: new Map([['user:jdoe', aliases]]),
    scoresById: new Map(Object.entries(scoresById)),
  })
    .filter(({ riskChangeEntity }) => riskChangeEntity)
    .map(({ text }) => text);

describe('buildFacts risk change', () => {
  it.each<[string, Entity, Record<string, number>, Entity[], string[]]>([
    [
      'up',
      record('user:jdoe', 71.4),
      { 'user:jdoe': 38.2 },
      [],
      ['Risk score 38 at the start of the last 7 days (7 October), 71 now, up 33 points'],
    ],
    [
      'down',
      record('user:jdoe', 40),
      { 'user:jdoe': 55 },
      [],
      ['Risk score 55 at the start of the last 7 days (7 October), 40 now, down 15 points'],
    ],
    [
      'unchanged',
      record('user:jdoe', 50.2),
      { 'user:jdoe': 49.9 },
      [],
      ['Risk score 50 at the start of the last 7 days (7 October), 50 now, unchanged'],
    ],
    [
      'no score at the start, never zero',
      record('user:jdoe', 64),
      {},
      [],
      ['No risk score at the start of the last 7 days, 64 now'],
    ],
    [
      'the resolution group member that moved most',
      record('user:jdoe', 30),
      { 'user:jdoe': 28, 'user:jdoe-laptop': 20 },
      [record('user:jdoe-laptop', 80, 'user:jdoe'), record('user:jdoe-mail', 90, 'user:jdoe')],
      [
        'Resolution group member "jdoe-laptop": risk score 20 at the start of the last 7 days (7 October), 80 now, up 60 points',
      ],
    ],
    ['nothing without a score now', record('user:jdoe'), { 'user:jdoe': 40 }, [], []],
  ])('states the risk change: %s', (_name, entityRecord, scoresById, aliases, expected) => {
    expect(riskChangeFacts(entityRecord, scoresById, aliases)).toEqual(expected);
  });

  it('has no risk change fact when the risk at the start was not read', () => {
    const facts = buildFacts([candidate(record('user:jdoe', 71))], scope);
    expect(facts.some(({ riskChangeEntity }) => riskChangeEntity)).toBe(false);
  });
});

describe('getCitedRiskChanges', () => {
  it('returns a chart entity only for priorities citing their risk change fact', () => {
    const facts = buildFacts(
      [
        candidate(record('user:jdoe', 71)),
        { ...candidate(record('host:web', 60)), id: 'host:web', type: 'host' },
      ],
      scope,
      {
        aliasesById: new Map(),
        scoresById: new Map([
          ['user:jdoe', 38],
          ['host:web', 20],
        ]),
      }
    );
    const factId = (entityId: string, isRiskChange: boolean) =>
      facts.find(
        (fact) => fact.entityId === entityId && Boolean(fact.riskChangeEntity) === isRiskChange
      )?.id ?? 0;
    const priority = (entityId: string, factIds: number[]): BriefPriority => ({
      entityId,
      observed: '',
      whyItMatters: '',
      nextStep: '',
      factIds,
    });
    const priorities = [
      priority('user:jdoe', [factId('user:jdoe', true)]),
      priority('host:web', [factId('host:web', false)]),
    ];

    expect([...getCitedRiskChanges(priorities, facts)]).toEqual([
      ['user:jdoe', { id: 'user:jdoe', name: 'jdoe', type: 'user' }],
    ]);
  });
});
