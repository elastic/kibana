/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import {
  type Filter,
  BooleanRelation,
  type CombinedFilter,
  FILTERS,
  isCombinedFilter,
} from '@kbn/es-query';
import type { PhraseFilter, PhraseFilterMetaParams } from '@kbn/es-query/src/filters/build_filters';
import { omit } from 'lodash';
import {
  CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
  addFilter,
  containsFilter,
  removeFilter,
} from './search_filters';

const dataViewId = 'test-data-view';

const buildFilterMock = (key: string, value: string, controlledBy?: string) => ({
  meta: {
    key,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field: key,
    controlledBy,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [key]: value,
    },
  },
});

const buildCombinedFilterMock = (filters: Filter[], controlledBy?: string): CombinedFilter => ({
  meta: {
    relation: BooleanRelation.OR,
    controlledBy,
    params: filters,
    type: FILTERS.COMBINED,
  },
  query: {},
});

describe('search_filters', () => {
  const key = 'test-key';
  const value = 'test-value';

  const controlledPhraseFilter: PhraseFilter = buildFilterMock(
    key,
    value,
    CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
  );

  describe('containsFilter', () => {
    it('should return true if the filter is present in the controlled phrase filter', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in a phrase filter (not controlled)', () => {
      const filters: Filter[] = [
        buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        buildFilterMock(key, value),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in the controlled combined filter', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock(
          [
            buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            controlledPhraseFilter,
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        ),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in a combined filter (not controlled)', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock([
          buildFilterMock(key, 'another-value'),
          buildFilterMock(key, value),
        ]),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return false if the filter is not present in empty filters', () => {
      const filters: Filter[] = [];
      expect(containsFilter(filters, key, value)).toBe(false);
    });

    it('should return false if the filter is not present with controlled filter with same key and different value', () => {
      const filters: Filter[] = [
        buildFilterMock(key, 'different-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
      ];
      expect(containsFilter(filters, key, value)).toBe(false);
    });

    it('should return false when the combined filter with same key and different value', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock(
          [
            buildFilterMock(key, 'different-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'different-value2', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        ),
      ];

      expect(containsFilter(filters, key, value)).toBe(false);
    });
  });

  describe('addFilter', () => {
    it('should add a new filter to an empty list', () => {
      const filters: Filter[] = [];

      // Act
      const newFilters = addFilter(dataViewId, filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(1);
      expect(newFilters[0]).toEqual({
        $state: { store: 'appState' },
        meta: expect.objectContaining({
          key,
          params: { query: value },
          controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
          index: dataViewId,
          disabled: false,
          field: key,
          negate: false,
          type: 'phrase',
        }),
        query: {
          match_phrase: {
            [key]: value,
          },
        },
      });
    });

    it('should add a new filter to an existing list with uncontrolled filter', () => {
      const filters: Filter[] = [buildFilterMock(key, 'another-value')];

      // Act
      const newFilters = addFilter(dataViewId, filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(1);
      expect(newFilters[0]).toEqual({
        $state: { store: 'appState' },
        meta: expect.objectContaining({
          params: [
            { ...filters[0], meta: { ...omit(filters[0].meta, 'disabled') } },
            {
              meta: expect.objectContaining({
                key,
                field: key,
                params: { query: value },
                index: dataViewId,
                controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
                type: 'phrase',
              }),
              query: {
                match_phrase: {
                  [key]: value,
                },
              },
            },
          ],
          index: dataViewId,
          controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
          relation: 'OR',
          type: 'combined',
        }),
      });
    });

    it('should combine with an existing filter', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      // Act
      const newFilters = addFilter(dataViewId, filters, key, 'new-value');

      // Assert
      expect(newFilters).toHaveLength(1);
      expect(newFilters[0].meta.params).toHaveLength(2);
    });

    it('should a new filter when the existing controlled (first) filter is disabled', () => {
      const filters: Filter[] = [
        { ...controlledPhraseFilter, meta: { ...controlledPhraseFilter.meta, disabled: true } },
      ];

      // Act
      const newFilters = addFilter(dataViewId, filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(2);
      expect(newFilters[0].meta.disabled).toBe(false);
      expect(newFilters[1].meta.disabled).toBe(true);
    });
  });

  describe('removeFilter', () => {
    it('should return the same filters when filter not found', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      // Act
      const newFilters = removeFilter(filters, key, 'non-existent-value');

      // Assert
      expect(newFilters).toHaveLength(1);
      expect(newFilters).toEqual(filters);
    });

    it('should remove a single phrase filter when present', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      // Act
      const newFilters = removeFilter(filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(0);
    });

    it('should not remove any filters if the filter is not present', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      // Act
      const newFilters = removeFilter(filters, key, 'non-existent-value');

      // Assert
      expect(newFilters).toHaveLength(1);
    });

    it('should remove the correct filter from combined filter and return phrase filter', () => {
      // Arrange
      const combinedFilter: CombinedFilter = buildCombinedFilterMock(
        [
          controlledPhraseFilter,
          buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        ],
        CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
      );
      const filters: Filter[] = [combinedFilter];

      // Act
      const newFilters = removeFilter(filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(1);
      expect(isCombinedFilter(newFilters[0])).toBe(false);
      expect(newFilters[0].meta.key).toBe(key);
      expect((newFilters[0].meta.params as PhraseFilterMetaParams).query).toBe('another-value');
    });

    it('should remove the correct filter from the a combined filter that contains more than 2 filters', () => {
      // Arrange
      const filters: Filter[] = [
        buildCombinedFilterMock(
          [
            buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'another-value1', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        ),
        buildCombinedFilterMock([
          buildFilterMock(key, value),
          buildFilterMock(key, 'another-value'),
          buildFilterMock(key, 'another-value2'),
        ]),
      ];

      // Act
      const newFilters = removeFilter(filters, key, value);

      // Assert
      expect(newFilters).toHaveLength(2);
      expect(isCombinedFilter(newFilters[1])).toBe(true);
      expect(newFilters[1].meta.params).toHaveLength(2);
    });
  });
});
