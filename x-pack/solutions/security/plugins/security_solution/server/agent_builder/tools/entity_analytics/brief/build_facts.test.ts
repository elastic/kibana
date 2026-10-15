/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate, EntityFacts } from './types';
import { buildFacts } from './build_facts';

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
    const [facts] = buildFacts([candidate(entity)], scope, riskAtStart);
    expect(facts.risk).toEqual(expected);
  });

  it('states first seen relative to the capture', () => {
    const [facts] = buildFacts(
      [candidate({ lifecycle: { first_seen: '2026-10-10T00:00:00.000Z' } })],
      scope
    );
    expect(facts.firstSeen).toBe('5 days ago');
  });
});
