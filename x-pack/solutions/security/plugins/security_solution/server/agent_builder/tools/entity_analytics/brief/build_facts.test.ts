/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './types';
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

describe('buildFacts', () => {
  it("states a group's risk, resolution first, and first seen relative to the capture", () => {
    const [facts] = buildFacts(
      [
        candidate({
          risk: { calculated_score_norm: 30 },
          relationships: { resolution: { risk: { calculated_score_norm: 80.4 } } },
          lifecycle: { first_seen: '2026-10-10T00:00:00.000Z' },
        }),
      ],
      scope
    );
    expect(facts).toMatchObject({
      risk: { of: 'resolution group', level: 'High', score: 80 },
      firstSeen: '5 days ago',
    });
  });

  it('gives each entity its own alerts and anomalies', () => {
    const anomalies = {
      count: 2,
      jobCount: 2,
      jobs: [{ index: 1, name: 'Unusual sent bytes', score: 75 }],
    };
    const [facts] = buildFacts([candidate({})], scope, {}, { 'user:jdoe': anomalies });
    expect(facts.anomalies).toEqual(anomalies);
    expect(facts.alerts).toBeUndefined();
  });
});
