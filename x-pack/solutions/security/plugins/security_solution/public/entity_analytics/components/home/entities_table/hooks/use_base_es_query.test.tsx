/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';

import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { DataViewContext } from '..';
import { useBaseEsQuery } from './use_base_es_query';

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = jest.mocked(useKibana);

const mockDataView = {
  id: 'entities-latest',
  title: 'entities-latest-default',
  timeFieldName: '@timestamp',
  getIndexPattern: () => 'entities-latest-default',
  fields: [],
} as unknown as DataView;

const dataViewContextValue = {
  dataView: mockDataView,
  dataViewIsLoading: false,
};

const wrapper = ({ children }: PropsWithChildren) => (
  <TestProviders>
    <DataViewContext.Provider value={dataViewContextValue}>{children}</DataViewContext.Provider>
  </TestProviders>
);

const flattenFilters = (filters: Array<Record<string, unknown>>): Array<Record<string, unknown>> =>
  filters.flatMap((f) =>
    typeof f === 'object' &&
    f !== null &&
    'bool' in f &&
    (f as { bool?: { filter?: unknown } }).bool?.filter
      ? ((f as { bool: { filter: Array<Record<string, unknown>> } }).bool.filter as Array<
          Record<string, unknown>
        >)
      : [f]
  );

describe('useBaseEsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addError: jest.fn() } },
        uiSettings: { get: jest.fn(() => false) },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  const renderBaseEsQuery = () =>
    renderHook(
      () =>
        useBaseEsQuery({
          filters: [],
          pageFilters: [],
          query: { query: '', language: 'kuery' },
        }),
      { wrapper }
    );

  it('does not add a @timestamp range filter to the base query', () => {
    const { result } = renderBaseEsQuery();

    const filters = (result.current.query?.bool?.filter ?? []) as Array<Record<string, unknown>>;
    const flattened = flattenFilters(filters);

    const timestampRanges = flattened.filter(
      (f) =>
        typeof f === 'object' &&
        f !== null &&
        'range' in f &&
        (f as { range?: Record<string, unknown> }).range !== undefined &&
        '@timestamp' in (f as { range: Record<string, unknown> }).range
    );

    expect(timestampRanges).toHaveLength(0);
  });

  it('returns a well-formed bool query even with empty inputs', () => {
    const { result } = renderBaseEsQuery();

    expect(result.current.query).toBeDefined();
    expect(result.current.query?.bool).toBeDefined();
    expect(Array.isArray(result.current.query?.bool?.filter)).toBe(true);
  });
});
