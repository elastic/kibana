/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_TILE_FILTER_ENTITY_IDS,
  buildTileFilter,
  buildTileWhereExpression,
  getCappedTileEntityIds,
} from './tile_entity_filter';

const IDS = ['host:a', 'user:b@c'];

describe('getCappedTileEntityIds', () => {
  it('keeps the first ids up to the cap', () => {
    const ids = Array.from({ length: MAX_TILE_FILTER_ENTITY_IDS + 5 }, (_, i) => `host:${i}`);

    expect(getCappedTileEntityIds(ids)).toEqual(ids.slice(0, MAX_TILE_FILTER_ENTITY_IDS));
    expect(getCappedTileEntityIds(IDS)).toEqual(IDS);
  });
});

describe('buildTileWhereExpression', () => {
  it('keeps the resolved rows of the tile entities', () => {
    expect(buildTileWhereExpression(IDS, 'resolved')).toBe('entity.id IN ("host:a", "user:b@c")');
  });

  it('keeps the tile entities and their records in individual rows', () => {
    expect(buildTileWhereExpression(IDS, 'individual')).toBe(
      '(entity.id IN ("host:a", "user:b@c") OR entity.relationships.resolution.resolved_to IN ("host:a", "user:b@c"))'
    );
  });

  it('matches nothing for a tile without entities', () => {
    expect(buildTileWhereExpression([], 'resolved')).toBe('false');
    expect(buildTileWhereExpression([], 'individual')).toBe('false');
  });
});

describe('buildTileFilter', () => {
  it('keeps the resolved rows of the tile entities', () => {
    expect(buildTileFilter(IDS, 'resolved')).toEqual({ terms: { 'entity.id': IDS } });
  });

  it('keeps the tile entities and their records in individual rows', () => {
    expect(buildTileFilter(IDS, 'individual')).toEqual({
      bool: {
        should: [
          { terms: { 'entity.id': IDS } },
          { terms: { 'entity.relationships.resolution.resolved_to': IDS } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('matches nothing for a tile without entities', () => {
    expect(buildTileFilter([], 'resolved')).toEqual({ match_none: {} });
  });
});
