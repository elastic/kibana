/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopAssetsQuery } from './get_top_assets_query';
import { ASSET_FIELDS } from '../../constants';
import { addEmptyDataFilterQuery } from '../../utils/add_empty_data_filter';

jest.mock('../fetch_utils', () => ({
  getMultiFieldsSort: jest.fn().mockReturnValue([{ field: 'mocked_sort' }]),
}));

jest.mock('../../utils/add_empty_data_filter', () => ({
  addEmptyDataFilterQuery: jest.fn((queryBoolFilter) => [
    ...queryBoolFilter,
    { match_phrase: { 'entity.id': '' } },
  ]),
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
  const indexPattern = 'index-pattern-test';

  const sort = [['some.field', 'desc']];

  it('should return a valid ES query with aggregations by entityType and entitySubType using entityId count', () => {
    const result = getTopAssetsQuery({ query, sort, enabled: true }, indexPattern);

    expect(result).toMatchObject({
      size: 0,
      index: indexPattern,
      ignore_unavailable: true,
      query: expect.objectContaining({
        bool: expect.objectContaining({
          filter: [{ term: { type: 'aws' } }],
          must: [],
          should: [],
          must_not: [{ match_phrase: { 'entity.id': '' } }],
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
    const result = getTopAssetsQuery(
      {
        query: { bool: { filter: [], must: [], should: [], must_not: [] } },
        sort,
        enabled: true,
      },
      indexPattern
    );

    expect(result.query.bool.filter).toEqual([]);
    expect(result.query.bool.must).toEqual([]);
    expect(result.query.bool.should).toEqual([]);
    expect(result.query.bool.must_not).toEqual([{ match_phrase: { 'entity.id': '' } }]);
  });

  it('should add empty entity.id filter to existing must_not filters', () => {
    const queryWithExistingMustNot = {
      bool: {
        filter: [],
        must: [],
        should: [],
        must_not: [{ term: { status: 'inactive' } }],
      },
    };

    const result = getTopAssetsQuery(
      { query: queryWithExistingMustNot, sort, enabled: true },
      indexPattern
    );

    expect(result.query.bool.must_not).toEqual([
      { term: { status: 'inactive' } },
      { match_phrase: { 'entity.id': '' } },
    ]);
  });

  it('should call addEmptyDataFilterQuery with the correct parameters', () => {
    getTopAssetsQuery({ query, sort, enabled: true }, indexPattern);

    expect(addEmptyDataFilterQuery).toHaveBeenCalledWith([]);
  });

  it('should throw an error if indexPattern is not provided', () => {
    expect(() => {
      getTopAssetsQuery({ query, sort, enabled: true });
    }).toThrowError('Index pattern is required');
  });
});
