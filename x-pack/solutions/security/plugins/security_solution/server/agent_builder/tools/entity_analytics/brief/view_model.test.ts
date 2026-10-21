/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { EntityFacts } from './types';
import type { CandidateEntities } from './read_entities';
import type { VerifiedBrief } from './verify_draft';
import { BriefViewModel, NO_PRIORITIES_LINE, QUIET_LINE, buildViewModel } from './view_model';

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  entityFilters: { riskLevels: ['High'] },
  focusTileId: 'riskMovers',
  tiles: {
    entitiesWithAlerts: {
      title: 'Entities with alerts',
      value: 14,
      delta: 3,
      entityIds: ['host:a', 'user:b'],
    },
    entitiesWithAnomalies: {
      title: 'Entities with anomalies',
      value: 0,
      unavailable: true,
      entityIds: [],
    },
    riskMovers: { title: 'Risk movers', value: 6, entityIds: ['host:a'] },
    newEntity: { title: 'New entity', value: 1, delta: 0, entityIds: ['user:b'] },
  },
};

const entities: CandidateEntities = {
  candidates: [
    { id: 'host:a', name: 'web_01', type: 'host', tileIds: ['entitiesWithAlerts'], record: {} },
    { id: 'user:b', name: 'jdoe', type: 'user', tileIds: ['newEntity'], record: {} },
  ],
  capturedCount: 2,
  readCount: 2,
  isTruncated: false,
  notFoundCount: 0,
};

const facts: EntityFacts[] = [
  {
    entityId: 'host:a',
    name: 'web_01',
    type: 'host',
    flaggedFor: ['entitiesWithAlerts', 'riskMovers'],
    risk: { of: 'resolution group', level: 'High', score: 82 },
    assetCriticality: 'High impact',
    alerts: { count: 3, rules: [{ name: 'Credential Dump', count: 2 }] },
    firstSeen: '5 days ago',
  },
  {
    entityId: 'user:b',
    name: 'jdoe',
    type: 'user',
    flaggedFor: ['newEntity'],
    privilegedUser: true,
    firstSeen: '2 days ago',
  },
];

const verified: VerifiedBrief = {
  summary: '{{ entity.id host:a }} rose sharply',
  recommendation: 'Start with {{ entity.id user:b }}.',
  priorities: [
    {
      entityId: 'user:b',
      assessment: 'New and privileged, which nothing else is',
      nextStep: 'Review its logins',
    },
    {
      entityId: 'host:a',
      assessment: 'Risk rose on a high impact asset.',
      nextStep: 'Review its alerts.',
    },
  ],
  droppedPriorityCount: 0,
};

const build = (overrides: Partial<Parameters<typeof buildViewModel>[0]> = {}) =>
  buildViewModel({ scope, spaceId: 'soc', entities, facts, verified, ...overrides });

describe('buildViewModel', () => {
  it('builds the model from the entities, the facts and the verified draft', () => {
    const viewModel = build({
      riskHistory: {
        entityId: 'host:a',
        history: {
          of: 'resolution group',
          from: '2026-10-07T12:00:00.000Z',
          to: '2026-10-14T12:00:00.000Z',
          points: [
            { t: '2026-10-10T23:00:00.000Z', score: 40, level: 'Moderate' },
            { t: '2026-10-13T23:00:00.000Z', score: 82, level: 'High' },
          ],
        },
      },
    });

    expect(BriefViewModel.parse(viewModel)).toEqual(viewModel);
    expect(viewModel).toMatchObject({
      version: 1,
      scope: {
        periodLabel: '7 days',
        spaceId: 'soc',
        focusTileTitle: 'Risk movers',
        entityFilters: ['Risk level: High'],
      },
      summary: 'web_01 rose sharply',
      recommendation: 'Start with jdoe.',
    });
    // The page's order, with the unavailable tile left out.
    expect(viewModel.counts.map(({ title }) => title)).toEqual([
      'Entities with alerts',
      'Risk movers',
      'New entity',
    ]);
    expect(viewModel.priorities).toMatchObject([
      {
        rank: 1,
        name: 'jdoe',
        privilegedUser: true,
        firstSeen: '2 days ago',
        assessment: 'New and privileged, which nothing else is.',
        nextStep: 'Review its logins.',
      },
      {
        rank: 2,
        name: 'web_01',
        risk: { score: 82, level: 'High', of: 'resolution group' },
        assetCriticality: 'High impact',
        alerts: { count: 3, rules: [{ name: 'Credential Dump', count: 2 }] },
        // First seen only for an entity flagged as new.
        firstSeen: undefined,
        riskHistory: { points: [{ score: 40 }, { score: 82 }] },
      },
    ]);
    expect(viewModel.priorities[0].riskHistory).toBeUndefined();
  });

  it('notes the flagged entities the Entity Store did not have', () => {
    expect(build({ entities: { ...entities, notFoundCount: 2 } }).notes).toContain(
      '2 flagged entities were not found in the Entity Store.'
    );
  });

  it('notes the tiles whose data could not be read', () => {
    expect(build().notes).toEqual([
      "Not checked, because the data couldn't be read: Entities with anomalies.",
    ]);
  });

  it('states that the brief covers a sample when a tile sent fewer entities than it counts', () => {
    expect(build().scope.sample).toBe(
      'Based on the 2 highest-ranked of at least 14 flagged entities.'
    );
  });

  it('says the view is quiet only when nothing readable is flagged, without a model call', () => {
    const quiet: EntityAnalyticsScope = {
      ...scope,
      tiles: {
        entitiesWithAlerts: { title: 'Entities with alerts', value: 0, delta: 0, entityIds: [] },
      },
    };
    expect(build({ scope: quiet, verified: undefined, facts: [] }).summary).toBe(QUIET_LINE);
    expect(build({ verified: undefined, facts: [] }).summary).toBe(NO_PRIORITIES_LINE);
  });
});
