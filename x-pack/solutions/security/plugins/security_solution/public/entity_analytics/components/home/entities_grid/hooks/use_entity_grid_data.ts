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
  applyResolvedEntityFilterOverrides,
  fetchResolvedEntityFilterOverrides,
  isFilteringByGroupValue,
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

const getFilterOverridesKey = (context: GridContext, options: OverridesOptions) =>
  [
    'entity-grid',
    getKeyScope(options),
    'resolved-entity-filter-overrides',
    {
      spaceId: context.spaceId,
      concreteEntityIndexName: context.concreteEntityIndexName,
      entityExpression: options.entityExpression,
      // Individual rows never read overrides, so their key never holds the resolved rows' ones.
      rowsMode: options.rowsMode,
    },
  ] as const;

const getQueryArgs = (context: GridContext, options: UseEntityGridDataOptions): QueryArgs => {
  const ready = getReadyContext(context);
  if (!ready) throw new Error('entities index not resolved');
  return buildQueryArgs(ready, options);
};

/** The count query of the view, or `null` until the space and the index resolve. */
const buildCountQuery = (context: GridContext, options: UseEntityGridDataOptions) =>
  getReadyContext(context) ? buildEntitiesInViewCountQuery(getQueryArgs(context, options)) : null;

const fetchCount = async (
  { searchService }: GridContext,
  countQuery: readonly string[],
  signal?: AbortSignal
): Promise<number> => {
  const [countRow] = await createEsqlRunner(searchService, signal)(countQuery);
  return (countRow && getNumber(countRow, 'total')) ?? 0;
};

/** The sort query reads one extra row, only to tell whether the view has more. */
const fetchRows = async (
  context: GridContext,
  options: UseEntityGridDataOptions,
  signal?: AbortSignal
): Promise<{ rows: Row[]; isAtLoadLimit: boolean }> => {
  const fetchSortPage = findSortPageFetcher(options.sortField);
  if (!fetchSortPage) throw new Error(`Column ${options.sortField} is not sortable`);
  const args = getQueryArgs(context, options);
  const rowsWithLookahead = await fetchSortPage(args, {
    runQuery: createEsqlRunner(context.searchService, signal),
  });
  return {
    rows: rowsWithLookahead.slice(0, args.pageSize),
    isAtLoadLimit: rowsWithLookahead.length > args.pageSize,
  };
};

type OverridesOptions = Pick<
  UseEntityGridDataOptions,
  'rowsMode' | 'entityExpression' | 'keyScope'
>;

const fetchFilterOverrides = (
  context: GridContext,
  { rowsMode, entityExpression }: OverridesOptions,
  signal?: AbortSignal
) => {
  const ready = getReadyContext(context);
  if (!ready) throw new Error('entities index not resolved');
  return fetchResolvedEntityFilterOverrides(
    {
      namespace: ready.spaceId,
      concreteEntityIndexName: ready.concreteEntityIndexName,
      rowsMode,
      entityExpression,
    },
    createEsqlRunner(context.searchService, signal)
  );
};

const limitPageSize = (options: UseEntityGridDataOptions): UseEntityGridDataOptions =>
  options.pageSize <= MAX_LOADED_ROWS ? options : { ...options, pageSize: MAX_LOADED_ROWS };

/** The resolved entities the entity filters add or remove, read before any query uses them. */
const useResolvedEntityFilterOverrides = (context: GridContext, options: OverridesOptions) =>
  useQuery(
    getFilterOverridesKey(context, options),
    ({ signal }) => fetchFilterOverrides(context, options, signal),
    { enabled: getReadyContext(context) != null && isFilteringByGroupValue(options) }
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
    ({ signal }) => fetchCount(context, countQuery ?? [], signal),
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
/** The overrides the grid's rows read, for another view of the same rows (Group by). */
export const useEntityFilterOverrides = (options: OverridesOptions) =>
  useResolvedEntityFilterOverrides(useGridContext(), options);

export const useEntityGridData = (
  requestedOptions: UseEntityGridDataOptions,
  /** Enrich only the rows the grid reports in view, through `onRowsInViewChange`. */
  { enrichRowsInView = false }: { enrichRowsInView?: boolean } = {}
) => {
  const options = useMemo(() => limitPageSize(requestedOptions), [requestedOptions]);
  const context = useGridContext();
  const resolvedEntityFilterOverrides = useResolvedEntityFilterOverrides(context, options);
  // Every query of the view waits for the overrides of its filters.
  const isReady = !isFilteringByGroupValue(options) || resolvedEntityFilterOverrides.data != null;
  // The filters judge resolved entities by their group's values, so the overrides join the filter.
  const viewOptions = useMemo(
    () => ({
      ...options,
      entityExpression:
        options.entityExpression &&
        applyResolvedEntityFilterOverrides(
          options.entityExpression,
          resolvedEntityFilterOverrides.data
        ),
    }),
    [options, resolvedEntityFilterOverrides.data]
  );
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
    prefetch,
    onRowsInViewChange,
    rows,
    isEnriching: enrichment.isEnriching,
    total: countQuery.data,
    updatedAt: Math.max(rowsQuery.dataUpdatedAt, enrichment.dataUpdatedAt) || null,
    isAtLoadLimit: !!rowsQuery.data?.isAtLoadLimit,
    isFetching:
      resolvedEntityFilterOverrides.isFetching ||
      rowsQuery.isFetching ||
      countQuery.isFetching ||
      enrichment.isFetching ||
      context.isEntitiesIndexLoading,
  };
};
