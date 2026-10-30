/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { ANOMALY_COUNT_FIELD } from '../common';
import type { QueryArgs, Row } from '../common';
import { MAX_LOADED_ROWS, useEntityGridData } from './use_entity_grid_data';
import type { GridContext, UseEntityGridDataOptions } from './use_entity_grid_context';
import { useGridContext } from './use_entity_grid_context';

const mockFetchSortPage = jest.fn();
const mockRunQuery = jest.fn();
const mockFetchResolvedEntityFilterOverrides = jest.fn();

jest.mock('../../../../../common/hooks/use_error_toast');
jest.mock('./use_entity_grid_context', () => ({
  ...jest.requireActual('./use_entity_grid_context'),
  useGridContext: jest.fn(),
}));
jest.mock('../grid_columns', () => ({
  findSortPageFetcher: (sortField: string) =>
    sortField === 'unsortable' ? undefined : mockFetchSortPage,
}));
jest.mock('../queries/esql', () => ({
  ...jest.requireActual('../queries/esql'),
  createEsqlRunner: () => mockRunQuery,
}));
jest.mock('../queries/resolved_entities', () => ({
  ...jest.requireActual('../queries/resolved_entities'),
  fetchResolvedEntityFilterOverrides: (...args: unknown[]) =>
    mockFetchResolvedEntityFilterOverrides(...args),
}));
jest.mock('./use_entity_grid_rows_enrichment', () => ({
  useEntityGridRowsEnrichment: (_context: unknown, _options: unknown, rows: Row[] = []) => ({
    rows,
    isEnriching: false,
    isFetching: false,
    dataUpdatedAt: 0,
    error: null,
  }),
}));

const OPTIONS: UseEntityGridDataOptions = {
  sortField: 'entity.name',
  sortDirection: 'asc',
  pageSize: 2,
  timeRange: '7d',
  rowsMode: 'resolved',
  keepFields: [],
  columnIds: [],
};

const entityRow = (n: number): Row => ({ 'entity.id': `e${n}`, 'entity.name': `name-e${n}` });

/** A sort query over `total` entities: like the real ones, it returns the rows plus one. */
const mockSortQueryOver = (total: number) =>
  mockFetchSortPage.mockImplementation(async ({ pageSize }: QueryArgs) =>
    Array.from({ length: Math.min(pageSize + 1, total) }, (_, i) => entityRow(i + 1))
  );

describe('useEntityGridData', () => {
  let queryClient: QueryClient;

  const mockContext = (overrides: Partial<GridContext> = {}) =>
    jest.mocked(useGridContext).mockReturnValue({
      queryClient,
      searchService: {} as GridContext['searchService'],
      http: httpServiceMock.createSetupContract(),
      spaceId: 'default',
      concreteEntityIndexName: 'entities-index',
      isEntitiesIndexLoading: false,
      entitiesIndexError: undefined,
      anomalyJobIds: [],
      isAnomalyJobsLoading: false,
      ...overrides,
    });

  const renderGridData = (options: UseEntityGridDataOptions = OPTIONS) =>
    renderHook(() => useEntityGridData(options), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockContext();
    mockRunQuery.mockResolvedValue([{ total: 40 }]);
    mockFetchResolvedEntityFilterOverrides.mockResolvedValue({ include: ['e9'], exclude: [] });
    mockSortQueryOver(5);
  });

  afterEach(() => queryClient.clear());

  describe('rows', () => {
    it('shows the rows, without the extra row that tells there are more', async () => {
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(result.current.rows).toEqual([entityRow(1), entityRow(2)]);
      expect(result.current.isAtLoadLimit).toBe(true);
      expect(mockFetchSortPage).toHaveBeenCalledTimes(1);
      expect(mockFetchSortPage).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 2 }),
        expect.anything()
      );
    });

    it('is not at the limit when the sort query returned no extra row', async () => {
      mockSortQueryOver(2);
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(result.current.isAtLoadLimit).toBe(false);
    });

    it('asks for no more rows than the most it loads', async () => {
      mockSortQueryOver(MAX_LOADED_ROWS + 100);

      const { result } = renderGridData({ ...OPTIONS, pageSize: MAX_LOADED_ROWS + 100 });

      await waitFor(() => expect(result.current.rows).toHaveLength(MAX_LOADED_ROWS));
      expect(mockFetchSortPage).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: MAX_LOADED_ROWS }),
        expect.anything()
      );
      expect(result.current.isAtLoadLimit).toBe(true);
    });
  });

  describe('the entity filters on the values of the resolved entities', () => {
    const FILTERED_OPTIONS: UseEntityGridDataOptions = {
      ...OPTIONS,
      entityExpression: 'asset.criticality IN ("high_impact")',
    };

    it('reads the rows and the count with the resolved entities the filters add or remove', async () => {
      const { result } = renderGridData(FILTERED_OPTIONS);

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(mockFetchResolvedEntityFilterOverrides).toHaveBeenCalledTimes(1);
      expect(mockFetchResolvedEntityFilterOverrides).toHaveBeenCalledWith(
        expect.objectContaining({
          entityExpression: FILTERED_OPTIONS.entityExpression,
        }),
        expect.any(Function)
      );
      expect(mockFetchSortPage).toHaveBeenCalledWith(
        expect.objectContaining({
          entityExpression: `(${FILTERED_OPTIONS.entityExpression}) OR entity.id IN ("e9")`,
        }),
        expect.anything()
      );
      expect(mockRunQuery.mock.calls[0][0].join('\n')).toContain('entity.id IN ("e9")');
    });

    it('waits for the overrides before it reads anything', async () => {
      let resolveOverrides: (overrides: {
        include: string[];
        exclude: string[];
      }) => void = () => {};
      mockFetchResolvedEntityFilterOverrides.mockReturnValue(
        new Promise((resolve) => {
          resolveOverrides = resolve;
        })
      );

      const { result } = renderGridData(FILTERED_OPTIONS);
      await waitFor(() => expect(mockFetchResolvedEntityFilterOverrides).toHaveBeenCalled());

      expect(mockFetchSortPage).not.toHaveBeenCalled();
      expect(mockRunQuery).not.toHaveBeenCalled();

      await act(async () => resolveOverrides({ include: [], exclude: [] }));

      await waitFor(() => expect(result.current.rows).toHaveLength(2));
    });

    it('reports the overrides it cannot read, and reads no rows', async () => {
      const error = new Error('too many resolved entities');
      mockFetchResolvedEntityFilterOverrides.mockRejectedValue(error);

      renderGridData(FILTERED_OPTIONS);

      await waitFor(() =>
        expect(useErrorToast).toHaveBeenLastCalledWith(expect.any(String), error)
      );
      expect(mockFetchSortPage).not.toHaveBeenCalled();
    });

    it('does not read the overrides without entity filters', async () => {
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(mockFetchResolvedEntityFilterOverrides).not.toHaveBeenCalled();
    });

    it('does not read the overrides for filters on other columns', async () => {
      const { result } = renderGridData({
        ...OPTIONS,
        entityExpression: 'entity.EngineMetadata.Type IN ("host")',
      });

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(mockFetchResolvedEntityFilterOverrides).not.toHaveBeenCalled();
    });

    it('does not read the overrides for individual rows', async () => {
      const { result } = renderGridData({ ...FILTERED_OPTIONS, rowsMode: 'individual' });

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(mockFetchResolvedEntityFilterOverrides).not.toHaveBeenCalled();
    });

    it('does not apply the overrides of resolved rows to individual rows', async () => {
      const { result, rerender } = renderHook(
        (options: UseEntityGridDataOptions) => useEntityGridData(options),
        {
          initialProps: FILTERED_OPTIONS,
          wrapper: ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );
      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      rerender({ ...FILTERED_OPTIONS, rowsMode: 'individual' });

      await waitFor(() =>
        expect(mockFetchSortPage).toHaveBeenLastCalledWith(
          expect.objectContaining({
            rowsMode: 'individual',
            entityExpression: FILTERED_OPTIONS.entityExpression,
          }),
          expect.anything()
        )
      );
    });
  });

  describe('waiting', () => {
    it('does not query until the entity index resolves', async () => {
      mockContext({ concreteEntityIndexName: null, isEntitiesIndexLoading: true });

      const { result } = renderGridData();

      expect(result.current.isFetching).toBe(true);
      expect(mockFetchSortPage).not.toHaveBeenCalled();
      expect(mockRunQuery).not.toHaveBeenCalled();
    });

    it('does not query until the space resolves', async () => {
      mockContext({ spaceId: null });

      renderGridData();

      expect(mockFetchSortPage).not.toHaveBeenCalled();
      expect(mockRunQuery).not.toHaveBeenCalled();
    });

    it('stops loading and reports it when there is no entity index to read', async () => {
      const error = new Error('The entities index is not available');
      mockContext({
        concreteEntityIndexName: null,
        isEntitiesIndexLoading: false,
        entitiesIndexError: error,
      });

      const { result } = renderGridData();

      expect(result.current.isFetching).toBe(false);
      expect(useErrorToast).toHaveBeenLastCalledWith(expect.any(String), error);
      expect(mockFetchSortPage).not.toHaveBeenCalled();
      expect(mockRunQuery).not.toHaveBeenCalled();
    });

    it('waits for the anomaly jobs before an anomaly sort', async () => {
      mockContext({ isAnomalyJobsLoading: true });

      renderGridData({ ...OPTIONS, sortField: ANOMALY_COUNT_FIELD });

      await waitFor(() => expect(mockRunQuery).toHaveBeenCalled());
      expect(mockFetchSortPage).not.toHaveBeenCalled();
    });

    it('does not wait for the anomaly jobs before other sorts', async () => {
      mockContext({ isAnomalyJobsLoading: true });

      renderGridData();

      await waitFor(() => expect(mockFetchSortPage).toHaveBeenCalled());
    });
  });

  describe('total', () => {
    it('is the number of entities in view', async () => {
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.total).toBe(40));
    });

    it('is undefined until the count arrives, not the number of rows loaded', async () => {
      mockRunQuery.mockReturnValue(new Promise(() => {}));
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(result.current.total).toBeUndefined();
    });
  });

  describe('errors', () => {
    it('reports a sort column that has no query', async () => {
      renderGridData({ ...OPTIONS, sortField: 'unsortable' });

      await waitFor(() =>
        expect(useErrorToast).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({ message: 'Column unsortable is not sortable' })
        )
      );
    });
  });

  describe('prefetch', () => {
    it('loads the rows of another view, so they are ready when that view mounts', async () => {
      const childOptions: UseEntityGridDataOptions = {
        ...OPTIONS,
        keyScope: 'children',
        entityExpression: 'entity.id IN ("e1")',
      };
      const { result } = renderGridData();
      await waitFor(() => expect(result.current.rows).toHaveLength(2));
      expect(mockFetchSortPage).toHaveBeenCalledTimes(1);

      act(() => result.current.prefetch(childOptions));
      await waitFor(() => expect(mockFetchSortPage).toHaveBeenCalledTimes(2));
      const { result: childResult } = renderGridData(childOptions);

      await waitFor(() => expect(childResult.current.rows).toHaveLength(2));
      expect(mockFetchSortPage).toHaveBeenCalledTimes(2);
    });
  });
});
