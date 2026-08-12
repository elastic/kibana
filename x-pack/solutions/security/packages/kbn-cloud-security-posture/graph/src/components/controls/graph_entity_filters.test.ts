/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_GRAPH_ENTITY_FILTERS,
  entityMatchesEntityFilters,
  getFindInPageMatches,
  hasActiveEntityFilters,
} from './graph_entity_filters';
import type { EntityNodeViewModel } from '../types';

const baseEntity: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Production Host',
  shape: 'hexagon',
  color: 'primary',
  tag: 'Host',
  riskScore: 75,
  assetCriticality: 'High impact',
};

describe('graph_entity_filters', () => {
  it('detects active filters', () => {
    expect(hasActiveEntityFilters(DEFAULT_GRAPH_ENTITY_FILTERS)).toBe(false);
    expect(
      hasActiveEntityFilters({
        ...DEFAULT_GRAPH_ENTITY_FILTERS,
        riskScoreMin: 50,
      })
    ).toBe(true);
  });

  it('matches entities by risk score threshold', () => {
    expect(
      entityMatchesEntityFilters(baseEntity, {
        ...DEFAULT_GRAPH_ENTITY_FILTERS,
        riskScoreMin: 70,
      })
    ).toBe(true);

    expect(
      entityMatchesEntityFilters(baseEntity, {
        ...DEFAULT_GRAPH_ENTITY_FILTERS,
        riskScoreMin: 80,
      })
    ).toBe(false);
  });

  it('matches entities by asset criticality', () => {
    expect(
      entityMatchesEntityFilters(baseEntity, {
        ...DEFAULT_GRAPH_ENTITY_FILTERS,
        assetCriticality: ['High impact'],
      })
    ).toBe(true);

    expect(
      entityMatchesEntityFilters(baseEntity, {
        ...DEFAULT_GRAPH_ENTITY_FILTERS,
        assetCriticality: ['Low impact'],
      })
    ).toBe(false);
  });

  it('finds in-page matches by label and id', () => {
    const matches = getFindInPageMatches(
      [baseEntity, { ...baseEntity, id: 'entity-2', label: 'Other' }],
      'production',
      DEFAULT_GRAPH_ENTITY_FILTERS
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe('entity-1');
  });
});
