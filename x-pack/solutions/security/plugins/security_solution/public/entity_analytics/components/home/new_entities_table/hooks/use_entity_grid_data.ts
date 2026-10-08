/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@kbn/react-query';
import type { QueryClient, QueryFunctionContext, UseQueryResult } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import type {
  EnrichedRows,
  PageCursor,
  QueryArgs,
  Row,
  RowsMode,
  SortDir,
  TimeRange,
} from '../common';
import {
  ANOMALY_COUNT_FIELD,
  createEsqlRunner,
  fetchEnrichedRows,
  getEntityIds,
  getEntityId,
  getNumber,
  nullOnFailure,
  toSortValue,
} from '../common';
import { PAGE_ENRICHERS, findSortQuerySpec } from '../grid_columns';

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

const ENRICH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.enrichError',
  { defaultMessage: 'Some columns of the entities table could not be loaded' }
);

/** Most rows the grid loads: it renders every loaded row, so it caps them. */
export const MAX_LOADED_ROWS = 500;

/** `page`: the grid rows. `children`: the records of expanded groups. */
export type EntityGridKeyScope = 'page' | 'children';

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

export interface UseEntityGridDataOptions {
  sortField: string;
  sortDirection: SortDir;
  /** Rows per load. */
  pageSize: number;
  searchExpression?: string;
  entityExpression?: string;
  timeRange: TimeRange;
  rowsMode?: RowsMode;
  keepFields?: readonly string[];
  keyScope?: EntityGridKeyScope;
}

/** One load of rows, and the cursor of the next one (`null` when there is none). */
interface RowsBatch {
  rows: Row[];
  nextCursor: PageCursor | null;
}

/** What the grid queries read besides their options. */
interface GridContext {
  queryClient: QueryClient;
  searchService: DataPublicPluginStart['search'];
  http: HttpSetup;
  spaceId: string;
  /** The entity index the queries join; `null` until it resolves. */
  concreteEntityIndexName: string | null;
  anomalyJobIds: readonly string[];
  isAnomalyJobsLoading: boolean;
}

const isAnomalySort = ({ sortField }: UseEntityGridDataOptions) =>
  sortField === ANOMALY_COUNT_FIELD;

// ── query keys ────────────────────────────────────────────────────────────────

/** What every query of a view depends on. */
const getViewKey = (
  { spaceId, concreteEntityIndexName }: GridContext,
  { sortField, searchExpression, entityExpression, timeRange, rowsMode }: UseEntityGridDataOptions
) => ({
  spaceId,
  concreteEntityIndexName,
  sortField,
  searchExpression,
  entityExpression,
  timeRange,
  rowsMode,
});

const getRowsKey = (context: GridContext, options: UseEntityGridDataOptions) =>
  [
    'entity-grid',
    options.keyScope ?? 'page',
    'rows',
    {
      ...getViewKey(context, options),
      sortDirection: options.sortDirection,
      pageSize: options.pageSize,
      keepFields: (options.keepFields ?? []).join('\0'),
      // Only the anomaly sort reads the anomaly jobs; other sorts don't wait for them.
      anomalyJobIds: isAnomalySort(options) ? context.anomalyJobIds.join('\0') : '',
    },
  ] as const;

/**
 * The count is keyed by its query text: every sort counts the entities in view, so they share
 * one cached total per filter set. It must not embed time-dependent values.
 */
const getCountKey = (context: GridContext, options: UseEntityGridDataOptions, countQuery: string) =>
  [
    'entity-grid',
    options.keyScope ?? 'page',
    'count',
    { spaceId: context.spaceId, countQuery },
  ] as const;

const getEnrichKey = (context: GridContext, options: UseEntityGridDataOptions, batch: RowsBatch) =>
  [
    'entity-grid',
    options.keyScope ?? 'page',
    'enrich',
    {
      ...getViewKey(context, options),
      sortDirection: options.sortDirection,
      entityIds: getEntityIds(batch.rows).join('\0'),
      anomalyJobIds: context.anomalyJobIds.join('\0'),
    },
  ] as const;

// ── requests ──────────────────────────────────────────────────────────────────

const buildQueryArgs = (
  { spaceId, anomalyJobIds }: GridContext,
  options: UseEntityGridDataOptions,
  concreteEntityIndexName: string,
  cursor: PageCursor | null
): QueryArgs => ({
  namespace: spaceId,
  timeRange: options.timeRange,
  sort: { field: options.sortField, direction: options.sortDirection },
  cursor,
  pageSize: options.pageSize,
  rowsMode: options.rowsMode ?? 'resolved',
  concreteEntityIndexName,
  searchExpression: options.searchExpression,
  entityExpression: options.entityExpression,
  keepFields: options.keepFields,
  anomalyJobIds,
});

/** The count query of the view, or `null` until the index resolves. */
const buildCountQuery = (context: GridContext, options: UseEntityGridDataOptions) => {
  const sortSpec = findSortQuerySpec(options.sortField);
  if (!context.concreteEntityIndexName || !sortSpec) return null;
  return sortSpec.buildCountQuery(
    buildQueryArgs(context, options, context.concreteEntityIndexName, null)
  );
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
  const sortSpec = findSortQuerySpec(options.sortField);
  if (!sortSpec) throw new Error(`Column ${options.sortField} is not sortable`);
  const runQuery = createEsqlRunner(context.searchService, signal);
  if (!sortSpec.fetchSortPage) return runQuery(sortSpec.buildSortQuery(args));
  return sortSpec.fetchSortPage(args, {
    runQuery,
    viewSize: await fetchViewSize(context, options),
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
  if (!context.concreteEntityIndexName) throw new Error('entity store index not resolved');
  const args = buildQueryArgs(context, options, context.concreteEntityIndexName, cursor);
  return getBatch(await fetchSortRows(context, options, args, signal), args);
};

/** The computed columns of a batch's rows. */
const fetchEnrichedBatch = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  batch: RowsBatch,
  signal?: AbortSignal
): Promise<EnrichedRows> => {
  if (!context.concreteEntityIndexName) return Promise.resolve({ rows: [], errors: [] });
  return fetchEnrichedRows(
    batch.rows,
    buildQueryArgs(context, options, context.concreteEntityIndexName, null),
    { runQuery: createEsqlRunner(context.searchService, signal), http: context.http, signal },
    PAGE_ENRICHERS[options.rowsMode ?? 'resolved']
  );
};

// ── rows ──────────────────────────────────────────────────────────────────────

/**
 * The loaded rows: each batch's rows with its computed columns once they are read. The rows
 * come from the batch, so a refetch shows fresh entity fields right away; the computed
 * columns come from the batch's enrich data, matched by entity id.
 */
export const getLoadedRows = (
  batches: ReadonlyArray<{ rows: readonly Row[]; enriched?: readonly Row[] }>
): Row[] =>
  batches.flatMap(({ rows, enriched }) => {
    if (!enriched) return [...rows];
    const enrichedById = new Map(enriched.map((row) => [getEntityId(row), row]));
    return rows.map((row) => ({ ...enrichedById.get(getEntityId(row)), ...row }));
  });

/** Whether more rows can load, or the grid already holds as many as it loads. */
const getLoadMoreState = (loadedRows: number, hasNextBatch: boolean) => ({
  canLoadMore: hasNextBatch && loadedRows < MAX_LOADED_ROWS,
  isAtLoadLimit: hasNextBatch && loadedRows >= MAX_LOADED_ROWS,
});

// ── hooks ─────────────────────────────────────────────────────────────────────

const useGridContext = (): GridContext => {
  const queryClient = useQueryClient();
  const {
    data: { search: searchService },
    http,
  } = useKibana().services;
  const spaceId = useSpaceId() ?? 'default';
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName ?? null;
  const { jobIds: anomalyJobIds, loading: isAnomalyJobsLoading } = useInstalledSecurityJobsIds();

  return useMemo(
    () => ({
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      anomalyJobIds,
      isAnomalyJobsLoading,
    }),
    [
      queryClient,
      searchService,
      http,
      spaceId,
      concreteEntityIndexName,
      anomalyJobIds,
      isAnomalyJobsLoading,
    ]
  );
};

const useRowsQuery = (context: GridContext, options: UseEntityGridDataOptions) =>
  useInfiniteQuery(
    getRowsKey(context, options),
    ({ pageParam = null, signal }) => fetchRowsBatch(context, options, pageParam, signal),
    {
      enabled:
        !!context.concreteEntityIndexName &&
        !(isAnomalySort(options) && context.isAnomalyJobsLoading),
      getNextPageParam: ({ nextCursor }) => nextCursor ?? undefined,
      // Keep painting the loaded rows while a new sort or filter loads.
      keepPreviousData: true,
      staleTime: ROWS_STALE_TIME_MS[options.keyScope ?? 'page'],
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

const useEnrichQueries = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  batches: readonly RowsBatch[],
  isPreviousData: boolean
) =>
  useQueries({
    queries: batches.map((batch) => ({
      queryKey: getEnrichKey(context, options, batch),
      queryFn: ({ signal }: QueryFunctionContext) =>
        fetchEnrichedBatch(context, options, batch, signal),
      enabled:
        !!context.concreteEntityIndexName &&
        !isPreviousData &&
        batch.rows.length > 0 &&
        !context.isAnomalyJobsLoading,
    })),
  });

/** The previous array while every item is the same, so memos that depend on it hold. */
const useStableArray = <T>(items: readonly T[]): readonly T[] => {
  const previous = useRef(items);
  if (
    previous.current.length !== items.length ||
    previous.current.some((item, i) => item !== items[i])
  ) {
    previous.current = items;
  }
  return previous.current;
};

/**
 * The loaded rows. They only change with their data: the grid remounts every cell when they
 * change, and useQueries returns new results on every render.
 */
const useLoadedRows = (
  batches: readonly RowsBatch[],
  enrichQueries: ReadonlyArray<UseQueryResult<EnrichedRows>>
) => {
  const enrichedRows = useStableArray(enrichQueries.map(({ data }) => data?.rows));
  return useMemo(
    () => getLoadedRows(batches.map(({ rows }, i) => ({ rows, enriched: enrichedRows[i] }))),
    [batches, enrichedRows]
  );
};

/** One toast for a failed load, and one when computed columns could not be read. */
const useGridErrorToasts = (
  loadError: unknown,
  enrichQueries: ReadonlyArray<UseQueryResult<EnrichedRows>>
) => {
  useErrorToast(GRID_QUERY_ERROR_TITLE, loadError ?? enrichQueries.find((q) => q.error)?.error);
  // Columns whose enricher failed show no value; say so, as an empty cell also means none.
  useErrorToast(
    ENRICH_ERROR_TITLE,
    enrichQueries.find(({ data }) => data?.errors.length)?.data?.errors[0]
  );
};

/** Fetches the first batch of any view ahead of time, e.g. a group's records on hover. */
const usePrefetch = (context: GridContext) =>
  useCallback(
    (options: UseEntityGridDataOptions) => {
      if (!context.concreteEntityIndexName) return;
      void context.queryClient.prefetchInfiniteQuery({
        queryKey: getRowsKey(context, options),
        queryFn: ({ signal }) => fetchRowsBatch(context, options, null, signal),
        staleTime: ROWS_STALE_TIME_MS[options.keyScope ?? 'page'],
      });
    },
    [context]
  );

/**
 * The grid's rows, loaded a batch at a time:
 * 1. Rows: the sort column's query (see queries/README.md), one batch plus one row. Each Load
 *    More starts after the last loaded row (its cursor).
 * 2. Count: the entities in view, shared by every sort.
 * 3. Enrich: each batch's computed columns, after its rows arrive. Keyed on the batch's entity
 *    ids, so a refetch with the same rows keeps showing them while it runs.
 * A new sort or filter starts over from the first batch, painting the previous rows until it
 * arrives. `prefetch` warms the first batch of another view, e.g. a group's records on hover.
 */
export const useEntityGridData = (options: UseEntityGridDataOptions) => {
  const context = useGridContext();
  const rowsQuery = useRowsQuery(context, options);
  const countQuery = useCountQuery(context, options);
  const batches = useMemo(() => rowsQuery.data?.pages ?? [], [rowsQuery.data]);
  const enrichQueries = useEnrichQueries(context, options, batches, rowsQuery.isPreviousData);
  const rows = useLoadedRows(batches, enrichQueries);
  const prefetch = usePrefetch(context);
  useGridErrorToasts(rowsQuery.error ?? countQuery.error, enrichQueries);

  return {
    rows,
    // Computed cells of a batch stay blank, rather than empty, until its enrich data arrives.
    isEnriching: enrichQueries.some(({ data, isFetching }) => data == null && isFetching),
    total: countQuery.data ?? rows.length,
    updatedAt:
      Math.max(rowsQuery.dataUpdatedAt, ...enrichQueries.map((q) => q.dataUpdatedAt)) || null,
    isFetching:
      rowsQuery.isFetching ||
      countQuery.isFetching ||
      enrichQueries.some((q) => q.isFetching) ||
      !context.concreteEntityIndexName,
    ...getLoadMoreState(rows.length, !!rowsQuery.hasNextPage),
    isLoadingMore: rowsQuery.isFetchingNextPage,
    loadMore: rowsQuery.fetchNextPage,
    prefetch,
  };
};
