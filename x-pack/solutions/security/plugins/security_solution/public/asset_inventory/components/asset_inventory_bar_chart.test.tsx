/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_FIELDS } from '../constants';
import { handleElementClick } from './asset_inventory_bar_chart';

describe('handleElementClick', () => {
  it('should call setQuery with the correct filters when sub_type is present', () => {
    const setQuery = jest.fn();

    const mockDatum = {
      [ASSET_FIELDS.ENTITY_TYPE]: 'host_type',
      [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'host_sub_type',
      count: 1,
    };

    const mockGeometryValue = {
      value: 'geometry-value',
      datum: mockDatum,
    };

    const mockSeriesIdentifier = {
      key: 'series-identifier',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: Array<[any, any]> = [[mockGeometryValue, mockSeriesIdentifier]];

    const mockIndexId = 'mock-index-id';

    handleElementClick(elements, setQuery, mockIndexId);

    expect(setQuery).toHaveBeenCalledWith({
      filters: [
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.type',
            negate: false,
            params: { query: 'host_type' },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'entity.type': 'host_type',
            },
          },
        },
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.sub_type',
            negate: false,
            params: { query: 'host_sub_type' },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'entity.sub_type': 'host_sub_type',
            },
          },
        },
      ],
    });
  });

  it('should call setQuery with entity.type filter and not exists filter for entity.sub_type when sub_type ends with "(uncategorized)"', () => {
    const setQuery = jest.fn();

    const mockDatum = {
      [ASSET_FIELDS.ENTITY_TYPE]: 'host_type',
      [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'host_type (uncategorized)',
      count: 1,
    };

    const mockGeometryValue = {
      value: 'geometry-value',
      datum: mockDatum,
    };

    const mockSeriesIdentifier = {
      key: 'series-identifier',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: Array<[any, any]> = [[mockGeometryValue, mockSeriesIdentifier]];

    const mockIndexId = 'mock-index-id';

    handleElementClick(elements, setQuery, mockIndexId);

    expect(setQuery).toHaveBeenCalledWith({
      filters: [
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.type',
            negate: false,
            params: { query: 'host_type' },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'entity.type': 'host_type',
            },
          },
        },
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.sub_type',
            negate: true,
            type: 'exists',
            params: { query: 'exists' },
          },
          query: {
            exists: { field: 'entity.sub_type' },
          },
        },
      ],
    });
  });

  it('should call setQuery with entity.type filter and not exists filter for entity.sub_type when sub_type is missing', () => {
    const setQuery = jest.fn();

    const mockDatum = {
      [ASSET_FIELDS.ENTITY_TYPE]: 'host_type',
      count: 1,
    };

    const mockGeometryValue = {
      value: 'geometry-value',
      datum: mockDatum,
    };

    const mockSeriesIdentifier = {
      key: 'series-identifier',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements: Array<[any, any]> = [[mockGeometryValue, mockSeriesIdentifier]];

    const mockIndexId = 'mock-index-id';

    handleElementClick(elements, setQuery, mockIndexId);

    expect(setQuery).toHaveBeenCalledWith({
      filters: [
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.type',
            negate: false,
            params: { query: 'host_type' },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'entity.type': 'host_type',
            },
          },
        },
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: 'mock-index-id',
            key: 'entity.sub_type',
            negate: true,
            type: 'exists',
            params: { query: 'exists' },
          },
          query: {
            exists: { field: 'entity.sub_type' },
          },
        },
      ],
    });
  });
});
