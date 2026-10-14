/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { isAbortError } from '../../../../../common/utils/exceptions';
import type { PageCursor, QueryArgs, Row, SortValue } from '../common';
import { ANOMALY_COUNT_FIELD, getEntityId, getNumber } from '../common';
import { findSortPageFetcher } from '../grid_columns';
import { buildEntitiesInViewCountQuery } from '../queries/entities_in_view';
import { createEsqlRunner } from '../queries/esql';
import { useEntityGridRowsEnrichment } from './use_entity_grid_rows_enrichment';
import {
  buildQueryArgs,
  getKeyScope,
  getReadyContext,
  getViewKey,
  useGridContext,
} from './use_entity_grid_context';
import type {
  EntityGridKeyScope,
  GridContext,
  RowsBatch,
  UseEntityGridDataOptions,
} from './use_entity_grid_context';

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

/**
 * Most rows the grid loads: its custom body renders every loaded row (no virtualization), so
 * it caps them. Not yet profiled in Chrome; raise it if rendering 1k rows stays smooth.
 */
export const MAX_LOADED_ROWS = 500;

/** Prefix of every query of expanded groups' records, e.g. for `useIsFetching`. */
export const ENTITY_GRID_CHILDREN_QUERY_KEY = ['entity-grid', 'children'] as const;

/**
 * How long loaded rows stay fresh. A group's records rarely change while it is expanded, so
 * prefetched records are still fresh when the row expands, and aren't read twice.
 */
const ROWS_STALE_TIME_MS: Readonly<Record<EntityGridKeyScope, number>> = {
  page: 0,
  children: 60_000,
};

const isAnomalySort = ({ sortField }: UseEntityGridDataOptions) =>
  sortField === ANOMALY_COUNT_FIELD;

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves to `null` when the request fails, so the caller can fall back instead of failing.
 * An abort still rejects: the query key changed and the caller drops the result.
 */
const nullOnFailure = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch((err) => {
    if (isAbortError(err)) throw err;
    return null;
  });

/** Narrows a sort column value for a cursor. */
const toSortValue = (value: unknown): SortValue =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

// ── query keys ────────────────────────────────────────────────────────────────

const getRowsKey = (context: GridContext, options: UseEntityGridDataOptions) =>
  [
    'entity-grid',
    getKeyScope(options),
    'rows',
    {
      ...getViewKey(context, options),
      sortDirection: options.sortDirection,
      pageSize: options.pageSize,
      keepFields: options.keepFields.join('\0'),
      // Only the anomaly sort reads the anomaly jobs; other sorts don't wait for them.
      anomalyJobIds: isAnomalySort(options) ? context.anomalyJobIds.join('\0') : '',
    },
  ] as const;

/**
 * The count is keyed by its query text: every sort counts the entities in view, so they share
 * one cached total per filter set. It must not embed time-dependent values.
 */
const getCountKey = (context: GridContext, options: UseEntityGridDataOptions, countQuery: string) =>
  ['entity-grid', getKeyScope(options), 'count', { spaceId: context.spaceId, countQuery }] as const;

// ── requests ──────────────────────────────────────────────────────────────────

/** The count query of the view, or `null` until the space and the index resolve. */
const buildCountQuery = (context: GridContext, options: UseEntityGridDataOptions) => {
  const ready = getReadyContext(context);
  return ready && buildEntitiesInViewCountQuery(buildQueryArgs(ready, options, null));
};

const fetchCount = async (
  { searchService }: GridContext,
  countQuery: string,
  signal?: AbortSignal
): Promise<number> => {
  const [countRow] = await createEsqlRunner(searchService, signal)(countQuery);
  return (countRow && getNumber(countRow, 'total')) ?? 0;
};

/**
 * The number of entities in view, which picks the sort query of a large view. Shares the
 * count query's cache. Without a count the view reads as small (0).
 */
const fetchViewSize = async (context: GridContext, options: UseEntityGridDataOptions) => {
  const countQuery = buildCountQuery(context, options);
  if (!countQuery) return 0;
  const count = await nullOnFailure(
    context.queryClient.fetchQuery({
      queryKey: getCountKey(context, options, countQuery),
      queryFn: ({ signal }) => fetchCount(context, countQuery, signal),
      staleTime: Infinity,
    })
  );
  return count ?? 0;
};

/** One load of rows plus one, from the sort column's query. */
const fetchSortRows = async (
  context: GridContext,
  options: UseEntityGridDataOptions,
  args: QueryArgs,
  signal?: AbortSignal
): Promise<Row[]> => {
  const fetchSortPage = findSortPageFetcher(options.sortField);
  if (!fetchSortPage) throw new Error(`Column ${options.sortField} is not sortable`);
  return fetchSortPage(args, {
    runQuery: createEsqlRunner(context.searchService, signal),
    fetchViewSize: () => fetchViewSize(context, options),
  });
};

const getCursorAfter = (row: Row, { sort }: QueryArgs): PageCursor => ({
  sortField: sort.field,
  sortDirection: sort.direction,
  sortValue: toSortValue(row[sort.field]),
  entityId: getEntityId(row) ?? '',
});

/**
 * The batch and the cursor of the next one, from a load that asked for one row more than it
 * shows: that extra (lookahead) row only tells whether another batch exists.
 */
const getBatch = (rowsWithLookahead: Row[], args: QueryArgs): RowsBatch => {
  if (rowsWithLookahead.length <= args.pageSize)
    return { rows: rowsWithLookahead, nextCursor: null };
  const rows = rowsWithLookahead.slice(0, args.pageSize);
  return { rows, nextCursor: getCursorAfter(rows[rows.length - 1], args) };
};

const fetchRowsBatch = async (
  context: GridContext,
  options: UseEntityGridDataOptions,
  cursor: PageCursor | null,
  signal?: AbortSignal
): Promise<RowsBatch> => {
  const ready = getReadyContext(context);
  if (!ready) throw new Error('entities index not resolved');
  const args = buildQueryArgs(ready, options, cursor);
  return getBatch(await fetchSortRows(context, options, args, signal), args);
};

// ── rows ──────────────────────────────────────────────────────────────────────

/** Whether another batch fits under the row limit, or the grid holds as many as it loads. */
const getLoadMoreState = (loadedRows: number, hasNextBatch: boolean, pageSize: number) => {
  const fitsAnotherBatch = loadedRows + pageSize <= MAX_LOADED_ROWS;
  return {
    canLoadMore: hasNextBatch && fitsAnotherBatch,
    isAtLoadLimit: hasNextBatch && !fitsAnotherBatch,
  };
};

/** The options with a batch no larger than the row limit. */
const limitPageSize = (options: UseEntityGridDataOptions): UseEntityGridDataOptions =>
  options.pageSize <= MAX_LOADED_ROWS ? options : { ...options, pageSize: MAX_LOADED_ROWS };

// ── hooks ─────────────────────────────────────────────────────────────────────

const useRowsQuery = (context: GridContext, options: UseEntityGridDataOptions) =>
  useInfiniteQuery(
    getRowsKey(context, options),
    ({ pageParam = null, signal }) => fetchRowsBatch(context, options, pageParam, signal),
    {
      enabled:
        getReadyContext(context) != null &&
        !(isAnomalySort(options) && context.isAnomalyJobsLoading),
      getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined,
      // Keep painting the loaded rows while a new sort or filter loads.
      keepPreviousData: true,
      staleTime: ROWS_STALE_TIME_MS[getKeyScope(options)],
    }
  );

const useCountQuery = (context: GridContext, options: UseEntityGridDataOptions) => {
  const countQuery = buildCountQuery(context, options);
  return useQuery(
    getCountKey(context, options, countQuery ?? ''),
    ({ signal }) => (countQuery ? fetchCount(context, countQuery, signal) : Promise.resolve(0)),
    // No keepPreviousData: a stale unfiltered total would show next to filtered rows.
    { enabled: countQuery != null }
  );
};

/** Fetches the first batch of any view ahead of time, e.g. a group's records on hover. */
const usePrefetch = (context: GridContext) =>
  useCallback(
    (viewOptions: UseEntityGridDataOptions) => {
      if (!getReadyContext(context)) return;
      const options = limitPageSize(viewOptions);
      void context.queryClient.prefetchInfiniteQuery({
        queryKey: getRowsKey(context, options),
        queryFn: ({ signal }) => fetchRowsBatch(context, options, null, signal),
        staleTime: ROWS_STALE_TIME_MS[getKeyScope(options)],
      });
    },
    [context]
  );

/**
 * The grid's rows, loaded a batch at a time:
 * 1. Rows: the sort column's query (see queries/README.md), one batch plus one row. Each Load
 *    More starts after the last loaded row (its cursor).
 * 2. Count: the entities in view, shared by every sort.
 * 3. Enrich: each batch's computed columns, after its rows arrive (see the enrichment hook).
 * A new sort or filter starts over from the first batch, painting the previous rows until it
 * arrives. `prefetch` warms the first batch of another view, e.g. a group's records on hover.
 */
export const useEntityGridData = (viewOptions: UseEntityGridDataOptions) => {
  const options = useMemo(() => limitPageSize(viewOptions), [viewOptions]);
  const context = useGridContext();
  const rowsQuery = useRowsQuery(context, options);
  const countQuery = useCountQuery(context, options);
  const batches = useMemo(() => rowsQuery.data?.pages ?? [], [rowsQuery.data]);
  const enrichment = useEntityGridRowsEnrichment(
    context,
    options,
    batches,
    rowsQuery.isPreviousData
  );
  const { rows } = enrichment;
  const prefetch = usePrefetch(context);
  useErrorToast(
    GRID_QUERY_ERROR_TITLE,
    context.entitiesIndexError ?? rowsQuery.error ?? countQuery.error ?? enrichment.error
  );

  return {
    rows,
    isEnriching: enrichment.isEnriching,
    total: countQuery.data ?? rows.length,
    updatedAt: Math.max(rowsQuery.dataUpdatedAt, enrichment.dataUpdatedAt) || null,
    isFetching:
      rowsQuery.isFetching ||
      countQuery.isFetching ||
      enrichment.isFetching ||
      context.isEntitiesIndexLoading,
    ...getLoadMoreState(rows.length, !!rowsQuery.hasNextPage, options.pageSize),
    isLoadingMore: rowsQuery.isFetchingNextPage,
    loadMore: rowsQuery.fetchNextPage,
    prefetch,
  };
};
