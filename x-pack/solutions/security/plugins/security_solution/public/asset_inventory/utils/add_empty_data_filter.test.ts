/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { addEmptyDataFilter, addEmptyDataFilterQuery } from './add_empty_data_filter';
import { ASSET_FIELDS } from '../constants';

describe('add_empty_data_filter', () => {
  describe('addEmptyDataFilter', () => {
    const mockIndex = 'test-index';
    const mockFilters: Filter[] = [
      {
        meta: {
          key: 'test.field',
          index: mockIndex,
          negate: false,
          type: 'phrase',
          params: { query: 'test-value' },
        },
        query: {
          match_phrase: {
            'test.field': 'test-value',
          },
        },
      },
    ];

    it('should add empty entity.id filter to existing filters array', () => {
      const result = addEmptyDataFilter(mockFilters, mockIndex);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockFilters[0]); // Original filter should be preserved

      // Check the added empty data filter
      const addedFilter = result[1];
      expect(addedFilter.meta).toEqual({
        key: ASSET_FIELDS.ENTITY_ID,
        index: mockIndex,
        negate: true,
        type: 'phrase',
        params: {
          query: '',
        },
      });
      expect(addedFilter.query).toEqual({
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      });
    });

    it('should add empty entity.id filter to empty filters array', () => {
      const result = addEmptyDataFilter([], mockIndex);

      expect(result).toHaveLength(1);
      const addedFilter = result[0];
      expect(addedFilter.meta).toEqual({
        key: ASSET_FIELDS.ENTITY_ID,
        index: mockIndex,
        negate: true,
        type: 'phrase',
        params: {
          query: '',
        },
      });
      expect(addedFilter.query).toEqual({
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      });
    });

    it('should work with different index names', () => {
      const customIndex = 'custom-asset-index';
      const result = addEmptyDataFilter([], customIndex);

      expect(result).toHaveLength(1);
      expect(result[0].meta.index).toBe(customIndex);
    });

    it('should not mutate the original filters array', () => {
      const originalFilters = [...mockFilters];
      const result = addEmptyDataFilter(mockFilters, mockIndex);

      expect(mockFilters).toEqual(originalFilters); // Original array should be unchanged
      expect(result).not.toBe(mockFilters); // Should return a new array
    });

    it('should create filter with correct entity.id field from constants', () => {
      const result = addEmptyDataFilter([], mockIndex);
      const addedFilter = result[0];

      expect(addedFilter.meta.key).toBe(ASSET_FIELDS.ENTITY_ID);
      expect(Object.keys(addedFilter?.query?.match_phrase)).toContain(ASSET_FIELDS.ENTITY_ID);
      expect(addedFilter?.query?.match_phrase?.[ASSET_FIELDS.ENTITY_ID]).toBe('');
    });
  });

  describe('addEmptyDataFilterQuery', () => {
    const mockQueryBoolFilter: QueryDslQueryContainer[] = [
      {
        term: {
          'test.field': 'test-value',
        },
      },
      {
        range: {
          '@timestamp': {
            gte: '2023-01-01',
            lte: '2023-12-31',
          },
        },
      },
    ];

    it('should add empty entity.id match_phrase query to existing query bool filter array', () => {
      const result = addEmptyDataFilterQuery(mockQueryBoolFilter);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockQueryBoolFilter[0]); // Original queries should be preserved
      expect(result[1]).toEqual(mockQueryBoolFilter[1]);

      // Check the added empty data filter query
      const addedQuery = result[2];
      expect(addedQuery).toEqual({
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      });
    });

    it('should add empty entity.id match_phrase query to empty query bool filter array', () => {
      const result = addEmptyDataFilterQuery([]);

      expect(result).toHaveLength(1);
      const addedQuery = result[0];
      expect(addedQuery).toEqual({
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      });
    });

    it('should not mutate the original query bool filter array', () => {
      const originalQueryBoolFilter = [...mockQueryBoolFilter];
      const result = addEmptyDataFilterQuery(mockQueryBoolFilter);

      expect(mockQueryBoolFilter).toEqual(originalQueryBoolFilter); // Original array should be unchanged
      expect(result).not.toBe(mockQueryBoolFilter); // Should return a new array
    });

    it('should create query with correct entity.id field from constants', () => {
      const result = addEmptyDataFilterQuery([]);
      const addedQuery = result[0];

      expect(addedQuery).toHaveProperty('match_phrase');
      expect(Object.keys(addedQuery?.match_phrase ?? {})).toContain(ASSET_FIELDS.ENTITY_ID);
      expect(addedQuery?.match_phrase?.[ASSET_FIELDS.ENTITY_ID]).toBe('');
    });

    it('should handle various query types in the input array', () => {
      const mixedQueries: QueryDslQueryContainer[] = [
        { term: { status: 'active' } },
        { bool: { must: [{ term: { type: 'asset' } }] } },
        { exists: { field: 'entity.name' } },
        { wildcard: { name: 'test*' } },
      ];

      const result = addEmptyDataFilterQuery(mixedQueries);

      expect(result).toHaveLength(5);
      // All original queries should be preserved
      mixedQueries.forEach((query, index) => {
        expect(result[index]).toEqual(query);
      });
      // The new query should be added at the end
      expect(result[4]).toEqual({
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      });
    });
  });
});
