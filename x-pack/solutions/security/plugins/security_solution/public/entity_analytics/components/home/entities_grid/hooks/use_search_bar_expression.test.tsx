/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import type { RowsMode } from '../common';
import type { GridContext } from './use_entity_grid_context';
import { useGridContext } from './use_entity_grid_context';
import { useSearchBarExpression } from './use_search_bar_expression';

const mockFetchResolvedEntityOverrides = jest.fn();
let mockFilters: Filter[] = [];
let mockQuery: { query: string; language: string } = { query: '', language: 'kuery' };

jest.mock('../../../../../common/store/inputs', () => ({
  inputsSelectors: {
    globalFiltersQuerySelector: () => 'filters',
    globalQuerySelector: () => 'query',
  },
}));
jest.mock('../../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: (selector: string) => (selector === 'filters' ? mockFilters : mockQuery),
}));
jest.mock('./use_entity_grid_context', () => ({
  ...jest.requireActual('./use_entity_grid_context'),
  useGridContext: jest.fn(),
}));
jest.mock('../queries/esql', () => ({
  ...jest.requireActual('../queries/esql'),
  createEsqlRunner: () => jest.fn(),
}));
jest.mock('../queries/resolved_entities', () => ({
  ...jest.requireActual('../queries/resolved_entities'),
  fetchResolvedEntityOverrides: (...args: unknown[]) => mockFetchResolvedEntityOverrides(...args),
}));

const phraseFilter = (field: string, value: string): Filter => ({
  meta: { key: field, type: FILTERS.PHRASE, params: { query: value } },
  query: { match_phrase: { [field]: value } },
});

const entityDataView = {
  fields: { getAll: () => [{ name: 'entity.id' }, { name: 'entity.name' }] },
} as unknown as DataView;

const PILL = { meta: { key: 'asset.criticality' }, query: {} } as unknown as Filter;

describe('useSearchBarExpression', () => {
  let queryClient: QueryClient;

  const renderSearch = (rowsMode: RowsMode = 'resolved', dataView?: DataView) =>
    renderHook(() => useSearchBarExpression(rowsMode, dataView), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFilters = [];
    mockQuery = { query: '', language: 'kuery' };
    jest.mocked(useGridContext).mockReturnValue({
      queryClient,
      searchService: {},
      spaceId: 'default',
      concreteEntityIndexName: 'entities-index',
      isEntitiesIndexLoading: false,
    } as unknown as GridContext);
    mockFetchResolvedEntityOverrides.mockResolvedValue({
      include: ['host:a'],
      exclude: ['host:b'],
    });
  });

  describe('a search the resolved rows can be judged on', () => {
    beforeEach(() => {
      mockQuery = { query: 'entity.name: bob', language: 'kuery' };
    });

    it('waits for the overrides, then adds them to the expression', async () => {
      const { result } = renderSearch();

      expect(result.current.isSearchOverridesPending).toBe(true);
      await waitFor(() => expect(result.current.isSearchOverridesPending).toBe(false));

      expect(result.current.searchOverrides).toEqual({ include: ['host:a'], exclude: ['host:b'] });
      expect(result.current.searchExpression).toContain('entity.id IN ("host:a")');
      expect(result.current.searchExpression).toContain('NOT entity.id IN ("host:b")');
      expect(mockFetchResolvedEntityOverrides).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: 'default',
          concreteEntityIndexName: 'entities-index',
          own: 'entity.name == "bob"',
        }),
        expect.anything()
      );
      expect(result.current.mainEntityOnlySearch).toBeUndefined();
    });

    it('falls back to the main entities, and names the search, when the overrides fail', async () => {
      mockFetchResolvedEntityOverrides.mockRejectedValue(new Error('too many'));
      const { result } = renderSearch();

      await waitFor(() => expect(result.current.isSearchOverridesPending).toBe(false));
      expect(result.current.searchOverrides).toBeUndefined();
      expect(result.current.mainEntityOnlySearch).toBeDefined();
      expect(result.current.mainEntityOnlySearch).toBe(result.current.searchExpression);
    });

    it('drops the lists it had when a refetch fails', async () => {
      const { result } = renderSearch();
      await waitFor(() => expect(result.current.searchOverrides).toBeDefined());

      mockFetchResolvedEntityOverrides.mockRejectedValue(new Error('too many'));
      await queryClient.invalidateQueries();

      await waitFor(() => expect(result.current.mainEntityOnlySearch).toBeDefined());
      expect(result.current.searchOverrides).toBeUndefined();
      expect(result.current.searchExpression).toBe(result.current.mainEntityOnlySearch);
    });

    it('drops the overrides when the search is cleared', async () => {
      const { result, rerender } = renderSearch();
      await waitFor(() => expect(result.current.searchOverrides).toBeDefined());

      mockQuery = { query: '', language: 'kuery' };
      rerender();

      expect(result.current.searchOverrides).toBeUndefined();
      expect(result.current.searchExpression).toBeUndefined();
      expect(result.current.isSearchOverridesPending).toBe(false);
    });

    it.each([
      ['criticality', 'asset.criticality: low_impact'],
      ['sources', 'entity.source: okta'],
      ['a stored group value', 'entity.risk.calculated_level: High'],
    ])('reads the overrides for a search on %s', async (_name, query) => {
      mockQuery = { query, language: 'kuery' };
      const { result } = renderSearch();

      await waitFor(() => expect(result.current.searchOverrides).toBeDefined());
      expect(mockFetchResolvedEntityOverrides).toHaveBeenCalledTimes(1);
    });
  });

  describe('a search that matches main entities only', () => {
    it.each([
      ['free text', { query: 'bob', language: 'kuery' }, []],
      ['a search that is not KQL', { query: 'entity.name: bob', language: 'lucene' }, []],
      ['filter pills with a KQL search', { query: 'entity.name: bob', language: 'kuery' }, [PILL]],
    ])('names the search, for %s, and keeps the expression as it is', (_name, query, filters) => {
      mockQuery = query;
      mockFilters = filters;
      const { result } = renderSearch();

      expect(result.current.mainEntityOnlySearch).toBeDefined();
      expect(result.current.mainEntityOnlySearch).toBe(result.current.searchExpression);
      expect(result.current.isSearchOverridesPending).toBe(false);
      expect(result.current.searchOverrides).toBeUndefined();
      expect(mockFetchResolvedEntityOverrides).not.toHaveBeenCalled();
    });

    it('names the new search when it changes to another such search', () => {
      mockQuery = { query: 'bob', language: 'kuery' };
      const { result, rerender } = renderSearch();
      const first = result.current.mainEntityOnlySearch;
      mockQuery = { query: 'alice', language: 'kuery' };
      rerender();

      expect(result.current.mainEntityOnlySearch).toBeDefined();
      expect(result.current.mainEntityOnlySearch).not.toBe(first);
    });
  });

  it('is the search as it is for individual rows, and names nothing', () => {
    mockQuery = { query: 'bob', language: 'kuery' };
    const { result } = renderSearch('individual');

    expect(result.current.isSearchOverridesPending).toBe(false);
    expect(mockFetchResolvedEntityOverrides).not.toHaveBeenCalled();
    expect(result.current.mainEntityOnlySearch).toBeUndefined();
  });

  it('has no search for an empty one', () => {
    const { result } = renderSearch();

    expect(result.current.searchExpression).toBeUndefined();
    expect(result.current.mainEntityOnlySearch).toBeUndefined();
  });

  describe('filters on fields the entity data view lacks', () => {
    beforeEach(() => {
      mockFilters = [
        phraseFilter('entity.id', 'host:a'),
        phraseFilter('kibana.alert.workflow_status', 'open'),
      ];
      mockQuery = { query: 'entity.name: a', language: 'kuery' };
    });

    it('leaves them out and reports their fields', () => {
      const { result } = renderSearch('individual', entityDataView);

      expect(result.current.ignoredFields).toEqual(['kibana.alert.workflow_status']);
      expect(result.current.applicableFilters).toEqual([mockFilters[0]]);
      expect(result.current.searchExpression).toContain('entity.id');
      expect(result.current.searchExpression).toContain('KQL(');
      expect(result.current.searchExpression).not.toContain('workflow_status');
    });

    it('converts every filter and ignores none while there is no data view', () => {
      const { result } = renderSearch('individual');

      expect(result.current.ignoredFields).toEqual([]);
      expect(result.current.applicableFilters).toEqual(mockFilters);
      expect(result.current.searchExpression).toContain('workflow_status');
    });

    it('is not a main-entities-only search when only an ignored filter is left of it', () => {
      mockQuery = { query: '', language: 'kuery' };
      mockFilters = [phraseFilter('kibana.alert.workflow_status', 'open')];
      const { result } = renderSearch('resolved', entityDataView);

      expect(result.current.searchExpression).toBeUndefined();
      expect(result.current.mainEntityOnlySearch).toBeUndefined();
      expect(result.current.ignoredFields).toEqual(['kibana.alert.workflow_status']);
    });
  });
});
