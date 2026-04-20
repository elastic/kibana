/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildResolutionModifierEntity } from './resolution_modifiers';

describe('buildResolutionModifierEntity', () => {
  it('uses max criticality and unions watchlists across group members', () => {
    const result = buildResolutionModifierEntity({
      score: {
        resolution_target_id: 'user:target-1',
        alert_count: 2,
        score: 88,
        normalized_score: 77,
        risk_inputs: [],
        related_entities: [
          {
            entity_id: 'user:alias-1',
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
          {
            entity_id: 'user:alias-2',
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
        ],
      },
      memberEntities: new Map([
        [
          'user:target-1',
          {
            entity: {
              id: 'user:target-1',
              attributes: { watchlists: ['wl-1'] },
            },
            asset: { criticality: 'low_impact' },
          },
        ],
        [
          'user:alias-1',
          {
            entity: {
              id: 'user:alias-1',
              attributes: { watchlists: ['wl-2', 'wl-1'] },
            },
            asset: { criticality: 'extreme_impact' },
          },
        ],
        [
          'user:alias-2',
          {
            entity: {
              id: 'user:alias-2',
              attributes: { watchlists: ['wl-3'] },
            },
            asset: { criticality: 'high_impact' },
          },
        ],
      ]),
    });

    expect(result.asset?.criticality).toBe('extreme_impact');
    expect(result.entity?.attributes?.watchlists).toEqual(
      expect.arrayContaining(['wl-1', 'wl-2', 'wl-3'])
    );
  });
});
