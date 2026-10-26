/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useBaseEsQuery } from './use_base_es_query';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '../../../common/lib/kibana';
import { useDataViewContext } from '../data_view_context';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';

jest.mock('../../../common/lib/kibana');
jest.mock('../data_view_context');

const mockDataView = {
  id: 'test-data-view',
  title: 'test-*',
  getIndexPattern: () => 'test-*',
  fields: [
    {
      name: 'entity.name',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    },
    {
      name: 'entity.type',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    },
  ],
} as unknown as DataView;

const uiSettings = coreMock.createStart().uiSettings;
const notifications = coreMock.createStart().notifications;
const filterManager = {
  setAppFilters: jest.fn(),
};
const queryString = {
  setQuery: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      notifications,
      uiSettings,
      data: {
        query: {
          filterManager,
          queryString,
        },
      },
    },
  });

  (useDataViewContext as jest.Mock).mockReturnValue({
    dataView: mockDataView,
  });

  uiSettings.get = jest.fn().mockReturnValue(true);
});

describe('useBaseEsQuery', () => {
  it('should build and return a valid ES query', () => {
    const query = { query: 'entity.sub_type: "Compute"', language: 'kuery' };

    const filters = [
      {
        meta: { disabled: false, key: 'entity.type', negate: false },
        query: {
          match: { 'entity.type': 'host' },
        },
      },
    ];
    const pageFilters: Filter[] = [
      {
        meta: { disabled: false, key: 'entity.name', negate: false },
        query: {
          match: { 'entity.name': 'test-host' },
        },
      },
    ];

    const { result } = renderHook(() => useBaseEsQuery({ query, filters, pageFilters }));

    expect(result.current.query).toBeDefined();
    expect(result.current.query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match_phrase: {
                    'entity.sub_type': 'Compute',
                  },
                },
              ],
            },
          },
          {
            match: { 'entity.type': 'host' },
          },
          {
            match: { 'entity.name': 'test-host' },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });

    expect(filterManager.setAppFilters).toHaveBeenCalledWith(filters);
    expect(filterManager.setAppFilters).not.toHaveBeenCalledWith(pageFilters);
    expect(queryString.setQuery).toHaveBeenCalledWith(query);
    expect(notifications.toasts.addError).not.toHaveBeenCalled();
  });
});
