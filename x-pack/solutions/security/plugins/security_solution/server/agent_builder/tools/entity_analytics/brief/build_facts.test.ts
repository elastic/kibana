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
  it.each<[string, NonNullable<Entity['entity']>, EntityFacts['risk']]>([
    ["the entity's own risk", own(71.4), { of: 'entity', level: 'High', score: 71 }],
    [
      "a resolution group's risk, resolution first",
      group(80),
      { of: 'resolution group', level: 'High', score: 80 },
    ],
    ['no risk', {}, undefined],
  ])('states risk: %s', (_name, entity, expected) => {
    const [facts] = buildFacts([candidate(entity)], scope);
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
