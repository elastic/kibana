/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBaseEsQuery } from './use_base_es_query';
import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { DataViewContext } from '..';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import React from 'react';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/hooks/use_global_filter_query');
jest.mock('../../../../../common/containers/use_global_time');
jest.mock('../../../../../common/lib/kuery', () => ({
  buildTimeRangeFilter: (from: string, to: string) => ({
    query: {
      range: {
        '@timestamp': {
          gte: from,
          lt: to,
          format: 'strict_date_optional_time',
        },
      },
    },
    meta: {
      type: 'range',
      disabled: false,
      negate: false,
      alias: null,
      key: '@timestamp',
      params: { gte: from, lt: to, format: 'strict_date_optional_time' },
    },
  }),
}));

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

const mockUseGlobalFilterQuery = useGlobalFilterQuery as jest.Mock;
const mockUseGlobalTime = useGlobalTime as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    DataViewContext.Provider,
    { value: { dataView: mockDataView, dataViewIsLoading: false } },
    children
  );

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

  mockUseGlobalTime.mockReturnValue({
    from: '2024-01-01T00:00:00.000Z',
    to: '2024-01-02T00:00:00.000Z',
  });

  mockUseGlobalFilterQuery.mockReturnValue({
    filterQuery: undefined,
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

    const { result } = renderHook(() => useBaseEsQuery({ query, filters, pageFilters }), {
      wrapper,
    });

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

  it('should pass time range filter as extraFilter to useGlobalFilterQuery', () => {
    const query = { query: '', language: 'kuery' };

    renderHook(() => useBaseEsQuery({ query, filters: [] }), { wrapper });

    expect(mockUseGlobalFilterQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        extraFilter: expect.objectContaining({
          meta: expect.objectContaining({
            disabled: false,
          }),
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2024-01-01T00:00:00.000Z',
                lt: '2024-01-02T00:00:00.000Z',
              },
            },
          },
        }),
      })
    );
  });

  it('should include global filter query in the result', () => {
    const globalFilter = {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2024-01-01T00:00:00.000Z',
                lt: '2024-01-02T00:00:00.000Z',
              },
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    };

    mockUseGlobalFilterQuery.mockReturnValue({
      filterQuery: globalFilter,
    });

    const query = { query: '', language: 'kuery' };

    const { result } = renderHook(() => useBaseEsQuery({ query, filters: [] }), { wrapper });

    expect(result.current.query).toBeDefined();
    expect(result.current.query?.bool.filter).toContainEqual(globalFilter);
  });

  it('should update time range filter when global time changes', () => {
    const query = { query: '', language: 'kuery' };

    mockUseGlobalTime.mockReturnValue({
      from: '2024-06-01T00:00:00.000Z',
      to: '2024-06-30T00:00:00.000Z',
    });

    renderHook(() => useBaseEsQuery({ query, filters: [] }), { wrapper });

    expect(mockUseGlobalFilterQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        extraFilter: expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2024-06-01T00:00:00.000Z',
                lt: '2024-06-30T00:00:00.000Z',
              },
            },
          },
        }),
      })
    );
  });
});
