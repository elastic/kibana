/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import type { QueryArgs, Row } from '../common';
import { ANOMALY_COUNT_FIELD, getNumber } from '../common';
import { findSortPageFetcher } from '../grid_columns';
import { buildEntitiesInViewCountQuery } from '../queries/entities_in_view';
import { createEsqlRunner } from '../queries/esql';
import {
  fetchResolvedEntityFilterOverrides,
  needsResolvedEntityFilterOverrides,
} from '../queries/resolved_entities';
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
  UseEntityGridDataOptions,
} from './use_entity_grid_context';

const GRID_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.queryError',
  { defaultMessage: 'Error loading entities table' }
);

/** The body renders and enriches only the rows in view, so the grid can load this many. */
export const MAX_LOADED_ROWS = 1_000;

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
const getCountKey = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  countQuery: readonly string[]
) =>
  [
    'entity-grid',
    getKeyScope(options),
    'count',
    { spaceId: context.spaceId, countQuery: countQuery.join('\n') },
  ] as const;

// ── requests ──────────────────────────────────────────────────────────────────

/** The count query of the view, or `null` until the space and the index resolve. */
const buildCountQuery = (context: GridContext, options: UseEntityGridDataOptions) => {
  const ready = getReadyContext(context);
  return ready && buildEntitiesInViewCountQuery(buildQueryArgs(ready, options));
};

const fetchCount = async (
  { searchService }: GridContext,
  countQuery: readonly string[],
  signal?: AbortSignal
): Promise<number> => {
  const [countRow] = await createEsqlRunner(searchService, signal)(countQuery);
  return (countRow && getNumber(countRow, 'total')) ?? 0;
};

const fetchSortRows = async (
  context: GridContext,
  options: UseEntityGridDataOptions,
  args: QueryArgs,
  signal?: AbortSignal
): Promise<Row[]> => {
  const fetchSortPage = findSortPageFetcher(options.sortField);
  if (!fetchSortPage) throw new Error(`Column ${options.sortField} is not sortable`);
  return fetchSortPage(args, { runQuery: createEsqlRunner(context.searchService, signal) });
};

/** The sort query reads one extra row, only to tell whether the view has more. */
const fetchRows = async (
  context: GridContext,
  options: UseEntityGridDataOptions,
  signal?: AbortSignal
): Promise<{ rows: Row[]; hasMore: boolean }> => {
  const ready = getReadyContext(context);
  if (!ready) throw new Error('entities index not resolved');
  const args = buildQueryArgs(ready, options);
  const rowsWithLookahead = await fetchSortRows(context, options, args, signal);
  return {
    rows: rowsWithLookahead.slice(0, args.pageSize),
    hasMore: rowsWithLookahead.length > args.pageSize,
  };
};

const limitPageSize = (options: UseEntityGridDataOptions): UseEntityGridDataOptions =>
  options.pageSize <= MAX_LOADED_ROWS ? options : { ...options, pageSize: MAX_LOADED_ROWS };

// ── hooks ─────────────────────────────────────────────────────────────────────

const fetchFilterOverrides = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  signal?: AbortSignal
) => {
  const ready = getReadyContext(context);
  if (!ready) throw new Error('entities index not resolved');
  const args = buildQueryArgs(ready, options);
  return fetchResolvedEntityFilterOverrides(args, createEsqlRunner(context.searchService, signal));
};

/** The resolved entities the entity filters add or remove, read before any query uses them. */
const useResolvedEntityFilterOverrides = (
  context: GridContext,
  options: UseEntityGridDataOptions
) =>
  useQuery(
    [
      'entity-grid',
      getKeyScope(options),
      'resolved-entity-filter-overrides',
      {
        spaceId: context.spaceId,
        concreteEntityIndexName: context.concreteEntityIndexName,
        entityExpression: options.entityExpression,
      },
    ],
    ({ signal }) => fetchFilterOverrides(context, options, signal),
    { enabled: getReadyContext(context) != null && needsResolvedEntityFilterOverrides(options) }
  );

const useRowsQuery = (context: GridContext, options: UseEntityGridDataOptions, isReady: boolean) =>
  useQuery(getRowsKey(context, options), ({ signal }) => fetchRows(context, options, signal), {
    enabled:
      isReady &&
      getReadyContext(context) != null &&
      !(isAnomalySort(options) && context.isAnomalyJobsLoading),
    // Keep painting the loaded rows while a new sort or filter loads.
    keepPreviousData: true,
    staleTime: ROWS_STALE_TIME_MS[getKeyScope(options)],
  });

const useCountQuery = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  isReady: boolean
) => {
  const countQuery = buildCountQuery(context, options);
  return useQuery(
    getCountKey(context, options, countQuery ?? []),
    ({ signal }) => (countQuery ? fetchCount(context, countQuery, signal) : Promise.resolve(0)),
    // No keepPreviousData: a stale unfiltered total would show next to filtered rows.
    { enabled: isReady && countQuery != null }
  );
};

/** Fetches the rows of any view ahead of time, e.g. a group's records on hover. */
const usePrefetch = (context: GridContext) =>
  useCallback(
    (viewOptions: UseEntityGridDataOptions) => {
      if (!getReadyContext(context)) return;
      const options = limitPageSize(viewOptions);
      void context.queryClient.prefetchQuery({
        queryKey: getRowsKey(context, options),
        queryFn: ({ signal }) => fetchRows(context, options, signal),
        staleTime: ROWS_STALE_TIME_MS[getKeyScope(options)],
      });
    },
    [context]
  );

/** The rows of the sort column's query, the count of the view, and the computed columns of rows in view. */
export const useEntityGridData = (
  requestedOptions: UseEntityGridDataOptions,
  /** Enrich only the rows the grid reports in view, through `onRowsInViewChange`. */
  { enrichRowsInView = false }: { enrichRowsInView?: boolean } = {}
) => {
  const options = useMemo(() => limitPageSize(requestedOptions), [requestedOptions]);
  const context = useGridContext();
  const resolvedEntityFilterOverrides = useResolvedEntityFilterOverrides(context, options);
  // Every query of the view waits for the overrides of its filters.
  const isReady =
    !needsResolvedEntityFilterOverrides(options) || resolvedEntityFilterOverrides.data != null;
  const viewOptions = {
    ...options,
    resolvedEntityFilterOverrides: resolvedEntityFilterOverrides.data,
  };
  const rowsQuery = useRowsQuery(context, viewOptions, isReady);
  const countQuery = useCountQuery(context, viewOptions, isReady);
  const enrichment = useEntityGridRowsEnrichment(
    context,
    viewOptions,
    rowsQuery.data?.rows,
    rowsQuery.isPreviousData,
    enrichRowsInView
  );
  const { rows, onRowsInViewChange } = enrichment;
  const prefetch = usePrefetch(context);
  useErrorToast(
    GRID_QUERY_ERROR_TITLE,
    context.entitiesIndexError ??
      resolvedEntityFilterOverrides.error ??
      rowsQuery.error ??
      countQuery.error ??
      enrichment.error
  );

  return {
    rows,
    isEnriching: enrichment.isEnriching,
    total: countQuery.data ?? rows.length,
    updatedAt: Math.max(rowsQuery.dataUpdatedAt, enrichment.dataUpdatedAt) || null,
    isFetching:
      resolvedEntityFilterOverrides.isFetching ||
      rowsQuery.isFetching ||
      countQuery.isFetching ||
      enrichment.isFetching ||
      context.isEntitiesIndexLoading,
    /** The view has more rows than the grid shows. */
    isAtLoadLimit: !!rowsQuery.data?.hasMore,
    prefetch,
    onRowsInViewChange,
  };
};
