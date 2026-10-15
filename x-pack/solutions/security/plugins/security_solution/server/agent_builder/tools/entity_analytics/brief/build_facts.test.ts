/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './brief_types';
import { buildFacts } from './build_facts';

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
  tileIds: ['entitiesWithAlerts'],
  record: entityRecord,
});

const riskChangeFacts = (
  entityRecord: Entity,
  scoresById: Record<string, number>,
  aliases: Entity[] = []
): string[] =>
  buildFacts([candidate(entityRecord)], scope, {
    riskAtStart: {
      aliasesById: new Map([['user:jdoe', aliases]]),
      scoresById: new Map(Object.entries(scoresById)),
    },
  })
    .map(({ text }) => text)
    .filter((text) => /risk score/i.test(text));

describe('buildFacts risk change', () => {
  it.each<[string, Entity, Record<string, number>, Entity[], string[]]>([
    [
      'up',
      record('user:jdoe', 71.4),
      { 'user:jdoe': 38.2 },
      [],
      ['Risk score 38 at the start of the last 7 days, 71 now, up 33 points'],
    ],
    [
      'down',
      record('user:jdoe', 40),
      { 'user:jdoe': 55 },
      [],
      ['Risk score 55 at the start of the last 7 days, 40 now, down 15 points'],
    ],
    [
      'unchanged',
      record('user:jdoe', 50.2),
      { 'user:jdoe': 49.9 },
      [],
      ['Risk score 50 at the start of the last 7 days, 50 now, unchanged'],
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
        'User "jdoe-laptop" in the same resolution group: risk score 20 at the start of the last 7 days, 80 now, up 60 points',
      ],
    ],
    ['nothing without a score now', record('user:jdoe'), { 'user:jdoe': 40 }, [], []],
  ])('states the risk change: %s', (_name, entityRecord, scoresById, aliases, expected) => {
    expect(riskChangeFacts(entityRecord, scoresById, aliases)).toEqual(expected);
  });

  it('has no risk change fact when the risk at the start was not read', () => {
    const facts = buildFacts([candidate(record('user:jdoe', 71))], scope);
    expect(facts.some(({ text }) => /risk score/i.test(text))).toBe(false);
  });
});

describe('buildFacts first seen', () => {
  it.each<[string, string, string | undefined, string]>([
    [
      'before the period',
      '2026-09-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      'First seen by the Entity Store a month ago',
    ],
    [
      'inside the period',
      '2026-10-10T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      'First seen by the Entity Store 5 days ago, inside the last 7 days',
    ],
    [
      "on the Entity Store's first day, inside the period",
      '2026-10-10T20:00:00.000Z',
      '2026-10-10T00:00:00.000Z',
      'First seen by the Entity Store 4 days ago, its first day of data',
    ],
    [
      'inside the period, when the store start is unknown',
      '2026-10-10T00:00:00.000Z',
      undefined,
      'First seen by the Entity Store 5 days ago, inside the last 7 days',
    ],
  ])('states first seen: %s', (_name, firstSeen, storeStartTimestamp, expected) => {
    const entityRecord: Entity = {
      entity: { id: 'user:jdoe', lifecycle: { first_seen: firstSeen } },
    };
    const texts = buildFacts([candidate(entityRecord)], scope, { storeStartTimestamp }).map(
      ({ text }) => text
    );
    expect(texts).toContain(expected);
  });
});
