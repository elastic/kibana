/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate, BriefPriority, EntityFacts } from './brief_types';
import { buildFacts, getRiskChartEntityId } from './build_facts';

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {},
};

const candidate = (entity: NonNullable<Entity['entity']>): BriefCandidate => ({
  id: 'user:jdoe',
  name: 'jdoe',
  type: 'user',
  tileIds: ['entitiesWithAlerts'],
  record: { entity: { id: 'user:jdoe', ...entity } },
});

const own = (score: number) => ({ risk: { calculated_score_norm: score } });
const group = (score: number) => ({
  risk: { calculated_score_norm: 30 },
  relationships: { resolution: { risk: { calculated_score_norm: score } } },
});

describe('buildFacts', () => {
  it.each<
    [string, NonNullable<Entity['entity']>, Map<string, number> | undefined, EntityFacts['risk']]
  >([
    [
      'up',
      own(71.4),
      new Map([['user:jdoe', 38.2]]),
      { of: 'entity', level: 'High', score: 71, atPeriodStart: 38, change: 33 },
    ],
    [
      'down',
      own(40),
      new Map([['user:jdoe', 55]]),
      { of: 'entity', level: 'Moderate', score: 40, atPeriodStart: 55, change: -15 },
    ],
    [
      'unchanged',
      own(50.2),
      new Map([['user:jdoe', 49.9]]),
      { of: 'entity', level: 'Moderate', score: 50, atPeriodStart: 50, change: 0 },
    ],
    [
      'not scored at the start: null, never 0',
      own(64),
      new Map(),
      { of: 'entity', level: 'Moderate', score: 64, atPeriodStart: null, change: undefined },
    ],
    [
      'the start could not be read',
      own(64),
      undefined,
      { of: 'entity', level: 'Moderate', score: 64, atPeriodStart: undefined, change: undefined },
    ],
    [
      "a resolution group's risk, resolution first",
      group(80),
      new Map([['user:jdoe', 60]]),
      { of: 'resolution group', level: 'High', score: 80, atPeriodStart: 60, change: 20 },
    ],
    ['no risk', {}, new Map(), undefined],
  ])('states risk: %s', (_name, entity, riskAtStart, expected) => {
    const [facts] = buildFacts([candidate(entity)], scope, { riskAtStart });
    expect(facts.risk).toEqual(expected);
  });

  it.each<[string, string, string | undefined, Partial<EntityFacts>]>([
    [
      'relative to the capture',
      '2026-10-10T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      { firstSeen: '5 days ago', firstSeenOnStoreFirstDay: undefined },
    ],
    [
      "on the Entity Store's first day",
      '2026-10-10T20:00:00.000Z',
      '2026-10-10T00:00:00.000Z',
      { firstSeen: '4 days ago', firstSeenOnStoreFirstDay: true },
    ],
  ])('states first seen %s', (_name, firstSeen, storeStartTimestamp, expected) => {
    const [facts] = buildFacts([candidate({ lifecycle: { first_seen: firstSeen } })], scope, {
      storeStartTimestamp,
    });
    expect(facts).toMatchObject(expected);
  });
});

describe('getRiskChartEntityId', () => {
  it('picks the first priority whose risk moved by at least 10 points', () => {
    const facts = (entityId: string, change: number): EntityFacts => ({
      entityId,
      name: entityId,
      type: 'host',
      flaggedFor: ['riskMovers'],
      risk: { of: 'entity', level: 'High', score: 80, atPeriodStart: 80 - change, change },
    });
    const priority = (entityId: string): BriefPriority => ({
      entityId,
      observed: '',
      whyItMatters: '',
      nextStep: '',
    });
    const all = [facts('host:wobble', 4), facts('host:moved', -12), facts('host:also', 30)];

    expect(
      getRiskChartEntityId(
        [priority('host:wobble'), priority('host:moved'), priority('host:also')],
        all
      )
    ).toBe('host:moved');
    expect(getRiskChartEntityId([priority('host:wobble')], all)).toBeUndefined();
  });
});
