/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildResolutionModifierEntity } from './resolution_modifiers';

describe('buildResolutionModifierEntity', () => {
  it('returns null criticality when all members have null criticality', () => {
    const result = buildResolutionModifierEntity({
      score: {
        resolution_target_id: 'user:target-1',
        alert_count: 1,
        score: 50,
        normalized_score: 40,
        risk_inputs: [],
        related_entities: [
          {
            entity_id: 'user:alias-1',
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
        ],
      },
      memberEntities: new Map([
        [
          'user:target-1',
          {
            entity: { id: 'user:target-1', attributes: {} },
            asset: { criticality: null },
          },
        ],
        [
          'user:alias-1',
          {
            entity: { id: 'user:alias-1', attributes: {} },
            asset: { criticality: null },
          },
        ],
      ]),
    });

    expect(result.asset?.criticality).toBeNull();
  });

  it('ignores missing members and still picks up criticality from present ones', () => {
    const result = buildResolutionModifierEntity({
      score: {
        resolution_target_id: 'user:target-1',
        alert_count: 1,
        score: 50,
        normalized_score: 40,
        risk_inputs: [],
        related_entities: [
          {
            entity_id: 'user:alias-missing',
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
          {
            entity_id: 'user:alias-1',
            relationship_type: 'entity.relationships.resolution.resolved_to',
          },
        ],
      },
      memberEntities: new Map([
        [
          'user:target-1',
          {
            entity: { id: 'user:target-1', attributes: {} },
            asset: { criticality: null },
          },
        ],
        [
          'user:alias-1',
          {
            entity: { id: 'user:alias-1', attributes: {} },
            asset: { criticality: 'medium_impact' },
          },
        ],
        // 'user:alias-missing' is intentionally absent from the map
      ]),
    });

    expect(result.asset?.criticality).toBe('medium_impact');
  });

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
