/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopAssetsQuery } from './get_top_assets_query';
import { ASSET_FIELDS } from '../../constants';

jest.mock('../fetch_utils', () => ({
  getMultiFieldsSort: jest.fn().mockReturnValue([{ field: 'mocked_sort' }]),
}));

describe('getTopAssetsQuery', () => {
  const query = {
    bool: {
      filter: [{ term: { type: 'aws' } }],
      must: [],
      should: [],
      must_not: [],
    },
  };

  const sort = [['some.field', 'desc']];

  it('should return a valid ES query with aggregations by entityType and entitySubType using entityId count', () => {
    const result = getTopAssetsQuery({ query, sort, enabled: true });

    expect(result).toMatchObject({
      size: 0,
      index: expect.any(String),
      ignore_unavailable: true,
      query: expect.objectContaining({
        bool: expect.objectContaining({
          filter: [{ term: { type: 'aws' } }],
          must: [],
          should: [],
          must_not: [],
        }),
      }),
      sort: [{ field: 'mocked_sort' }],
    });

    // Top-level aggregation on entityType
    const entityTypeAgg = result.aggs?.entityType;
    expect(entityTypeAgg).toBeDefined();
    expect(entityTypeAgg.terms.field).toBe(ASSET_FIELDS.ENTITY_TYPE);
    expect(entityTypeAgg.aggs?.entityId?.value_count.field).toBe(ASSET_FIELDS.ENTITY_ID);

    // Nested aggregation on entitySubType
    const entitySubTypeAgg = entityTypeAgg.aggs?.entitySubType;
    expect(entitySubTypeAgg).toBeDefined();
    expect(entitySubTypeAgg.terms.field).toBe(ASSET_FIELDS.ENTITY_SUB_TYPE);
    expect(entitySubTypeAgg.aggs?.entityId?.value_count.field).toBe(ASSET_FIELDS.ENTITY_ID);
  });

  it('should handle missing query subfields safely', () => {
    const result = getTopAssetsQuery({
      query: { bool: { filter: [], must: [], should: [], must_not: [] } },
      sort,
      enabled: true,
    });

    expect(result.query.bool.filter).toEqual([]);
    expect(result.query.bool.must).toEqual([]);
    expect(result.query.bool.should).toEqual([]);
    expect(result.query.bool.must_not).toEqual([]);
  });
});
