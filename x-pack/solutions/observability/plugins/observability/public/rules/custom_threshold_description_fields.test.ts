/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule, PrebuildFieldsMap } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { HttpSetup } from '@kbn/core/public';
import type { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold/latest';
import { getDescriptionFields } from './custom_threshold_description_fields';

describe('custom threshold getDescriptionFields', () => {
  const mockDataViewIndexPatternField = jest.fn();
  const mockCustomQueryField = jest.fn();
  const mockQueryFiltersField = jest.fn();

  const mockPrebuildFields = {
    dataViewIndexPattern: mockDataViewIndexPatternField,
    customQuery: mockCustomQueryField,
    queryFilters: mockQueryFiltersField,
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when rule is not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<CustomThresholdParams>,
      prebuildFields: mockPrebuildFields,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when prebuildFields is not provided', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          index: 'logs-*',
          query: {
            query: 'test query',
          },
        },
      },
    } as unknown as Rule<CustomThresholdParams>;

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: undefined,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when both rule and prebuildFields are not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<CustomThresholdParams>,
      prebuildFields: undefined,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when searchConfiguration is not provided', () => {
    const mockRule = {
      params: {},
    } as unknown as Rule<CustomThresholdParams>;

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
    });

    expect(result).toEqual([]);
  });

  it('should return the index when searchConfiguration.index is a string', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          index: 'logs-*',
          query: {},
        },
      },
    } as unknown as Rule<CustomThresholdParams>;

    const mockIndexReturnValue = { type: 'data_view_index_pattern', value: 'logs-*' };
    mockDataViewIndexPatternField.mockReturnValue(mockIndexReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
    });

    expect(mockDataViewIndexPatternField).toHaveBeenCalledWith('logs-*');
    expect(result).toEqual([mockIndexReturnValue]);
  });

  it('should return the query when searchConfiguration.query.query is a string', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          query: {
            query: 'status:error',
          },
        },
      },
    } as unknown as Rule<CustomThresholdParams>;

    const mockQueryReturnValue = { type: 'custom_query', value: 'status:error' };
    mockCustomQueryField.mockReturnValue(mockQueryReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
    });

    expect(mockCustomQueryField).toHaveBeenCalledWith('status:error');
    expect(result).toEqual([mockQueryReturnValue]);
  });

  it('should return query and index when both are provided and are a string', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          index: 'logs-*',
          query: {
            query: 'status:error',
          },
        },
      },
    } as unknown as Rule<CustomThresholdParams>;

    const mockIndexReturnValue = { type: 'data_view_index_pattern', value: 'logs-*' };
    const mockQueryReturnValue = { type: 'custom_query', value: 'status:error' };
    mockDataViewIndexPatternField.mockReturnValue(mockIndexReturnValue);
    mockCustomQueryField.mockReturnValue(mockQueryReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(mockDataViewIndexPatternField).toHaveBeenCalledWith('logs-*');
    expect(mockCustomQueryField).toHaveBeenCalledWith('status:error');
    expect(result).toEqual([mockIndexReturnValue, mockQueryReturnValue]);
  });

  it('should return the filters when searchConfiguration.filter is provided', () => {
    const mockRule = {
      params: {
        searchConfiguration: {
          filter: [
            {
              query: { match: { status: 'error' } },
              meta: {
                disabled: false,
              },
            },
          ],
          index: 'logs-*',
          query: {
            query: 'status:error',
          },
        },
      },
    } as unknown as Rule<CustomThresholdParams>;

    const mockIndexReturnValue = { type: 'dataViewIndexPattern', value: 'logs-*' };
    const mockQueryReturnValue = { type: 'customQuery', value: 'status:error' };
    const mockFiltersReturnValue = { type: 'queryFilters', value: 'filters representation' };
    mockDataViewIndexPatternField.mockReturnValue(mockIndexReturnValue);
    mockCustomQueryField.mockReturnValue(mockQueryReturnValue);
    mockQueryFiltersField.mockReturnValue(mockFiltersReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
    });

    expect(mockDataViewIndexPatternField).toHaveBeenCalledWith('logs-*');
    expect(mockQueryFiltersField).toHaveBeenCalledWith({
      filters: mockRule.params.searchConfiguration.filter,
      dataViewId: 'logs-*',
    });
    expect(result).toEqual([mockIndexReturnValue, mockQueryReturnValue, mockFiltersReturnValue]);
  });
});
