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
import type { SortPageContext } from '../queries/types';
import { MAX_LOADED_ROWS, useEntityGridData } from './use_entity_grid_data';
import type { GridContext, UseEntityGridDataOptions } from './use_entity_grid_context';
import { useGridContext } from './use_entity_grid_context';

const mockFetchSortPage = jest.fn();
const mockRunQuery = jest.fn();

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
jest.mock('./use_entity_grid_rows_enrichment', () => ({
  useEntityGridRowsEnrichment: (
    _context: unknown,
    _options: unknown,
    batches: Array<{ rows: Row[] }>
  ) => ({
    rows: batches.flatMap(({ rows }) => rows),
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
};

const entityRow = (n: number): Row => ({ 'entity.id': `e${n}`, 'entity.name': `name-e${n}` });

/**
 * A sort query over `total` entities: like the real ones, it returns one page plus one row,
 * starting after the cursor's entity.
 */
const mockSortQueryOver = (total: number) =>
  mockFetchSortPage.mockImplementation(async ({ cursor, pageSize }: QueryArgs) => {
    const start = cursor ? Number(cursor.entityId.slice(1)) : 0;
    return Array.from({ length: Math.min(pageSize + 1, total - start) }, (_, i) =>
      entityRow(start + i + 1)
    );
  });

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
    mockSortQueryOver(5);
  });

  afterEach(() => queryClient.clear());

  describe('rows', () => {
    it('shows one batch, without the extra row that tells there is more', async () => {
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(result.current.rows).toEqual([entityRow(1), entityRow(2)]);
      expect(result.current.canLoadMore).toBe(true);
      expect(mockFetchSortPage).toHaveBeenCalledTimes(1);
      expect(mockFetchSortPage).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 2, cursor: null }),
        expect.anything()
      );
    });

    it('loads the next batch after the last shown row', async () => {
      const { result } = renderGridData();
      await waitFor(() => expect(result.current.canLoadMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });
      await waitFor(() => expect(result.current.rows).toHaveLength(4));

      expect(result.current.rows.map(({ 'entity.id': id }) => id)).toEqual([
        'e1',
        'e2',
        'e3',
        'e4',
      ]);
      expect(mockFetchSortPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cursor: {
            sortField: 'entity.name',
            sortDirection: 'asc',
            sortValue: 'name-e2',
            entityId: 'e2',
          },
        }),
        expect.anything()
      );
    });

    it('cannot load more when the sort query returned no extra row', async () => {
      mockSortQueryOver(2);
      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(2));

      expect(result.current.canLoadMore).toBe(false);
      expect(result.current.isAtLoadLimit).toBe(false);
    });

    it('does not load a batch that would take the grid over the most rows it loads', async () => {
      mockSortQueryOver(MAX_LOADED_ROWS + 100);
      const { result } = renderGridData({ ...OPTIONS, pageSize: 300 });
      await waitFor(() => expect(result.current.rows).toHaveLength(300));

      expect(result.current.canLoadMore).toBe(false);
      expect(result.current.isAtLoadLimit).toBe(true);
    });

    it('asks for no more rows in a batch than the most it loads', async () => {
      mockSortQueryOver(MAX_LOADED_ROWS + 100);

      const { result } = renderGridData({ ...OPTIONS, pageSize: MAX_LOADED_ROWS + 100 });

      await waitFor(() => expect(result.current.rows).toHaveLength(MAX_LOADED_ROWS));
      expect(mockFetchSortPage).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: MAX_LOADED_ROWS }),
        expect.anything()
      );
    });

    it('stops loading once the grid holds the most rows it loads', async () => {
      mockSortQueryOver(MAX_LOADED_ROWS + 100);
      const { result } = renderGridData({ ...OPTIONS, pageSize: MAX_LOADED_ROWS / 2 });
      await waitFor(() => expect(result.current.canLoadMore).toBe(true));

      await act(async () => {
        await result.current.loadMore();
      });
      await waitFor(() => expect(result.current.rows).toHaveLength(MAX_LOADED_ROWS));

      expect(result.current.rows).toHaveLength(MAX_LOADED_ROWS);
      expect(result.current.canLoadMore).toBe(false);
      expect(result.current.isAtLoadLimit).toBe(true);
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
  });

  describe('view size', () => {
    /** Runs the sort query's view size request, as a large-view plan does. */
    const readViewSize = () => {
      let viewSize: number | undefined;
      mockFetchSortPage.mockImplementation(async (_args: QueryArgs, ctx: SortPageContext) => {
        viewSize = await ctx.fetchViewSize();
        return [entityRow(1)];
      });
      return () => viewSize;
    };

    it('gives the sort query the number of entities in view', async () => {
      const getViewSize = readViewSize();

      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(1));
      expect(getViewSize()).toBe(40);
    });

    it('reads as small when the count fails, and still loads the rows', async () => {
      mockRunQuery.mockRejectedValue(new Error('count failed'));
      const getViewSize = readViewSize();

      const { result } = renderGridData();

      await waitFor(() => expect(result.current.rows).toHaveLength(1));
      expect(getViewSize()).toBe(0);
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
    it('loads the first batch of another view, so it is ready when that view mounts', async () => {
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
