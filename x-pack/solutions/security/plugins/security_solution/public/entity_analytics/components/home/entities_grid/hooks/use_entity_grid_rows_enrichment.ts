/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import { chunk as toChunks } from 'lodash';
import { useQueries } from '@kbn/react-query';
import type { QueryFunctionContext, UseQueryResult } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { isAbortError } from '../../../../../common/utils/exceptions';
import type { QueryArgs, Row } from '../common';
import { getEntityId, getEntityIds } from '../common';
import { getPageEnrichers } from '../grid_columns';
import { createEsqlRunner } from '../queries/esql';
import type { EnrichedFields, PageEnricher, RunContext } from '../queries/types';
import {
  buildQueryArgs,
  getKeyScope,
  getReadyContext,
  getViewKey,
} from './use_entity_grid_context';
import type { GridContext, UseEntityGridDataOptions } from './use_entity_grid_context';

const ENRICH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.enrichError',
  { defaultMessage: 'Some columns of the entities table could not be loaded' }
);

/** Rows per enrich request: a virtualized grid enriches only the chunks of rows in view. */
export const ENRICH_CHUNK_SIZE = 50;

/** How long a chunk's computed columns stay fresh: scrolling back to it within this reads nothing. */
const ENRICH_STALE_TIME_MS = 60_000;

/** A sort query may already have read an enricher's fields, e.g. the alert sort its counts. */
const isMissingFields = (rows: readonly Row[], { fields }: PageEnricher): boolean =>
  fields.some((field) => rows.some((row) => !(field in row)));

/**
 * The rows with their computed columns, and the errors of the enrichers that failed: their
 * fields stay unset, so they read as unknown.
 */
export interface EnrichedRows {
  rows: Row[];
  errors: unknown[];
}

/**
 * Copies of `rows` with the fields of every enricher they lack. One enricher failing doesn't
 * fail the page: its error is returned with the rows. An abort still rejects: the query key
 * changed and the caller drops the result.
 */
export const fetchEnrichedRows = async (
  rows: readonly Row[],
  args: QueryArgs,
  ctx: RunContext,
  enrichers: readonly PageEnricher[]
): Promise<EnrichedRows> => {
  const settled = await Promise.allSettled(
    enrichers
      .filter((enricher) => isMissingFields(rows, enricher))
      .map(({ fetch }) => fetch(rows, args, ctx))
  );
  const results: EnrichedFields[] = [];
  const errors: unknown[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') results.push(result.value);
    else if (isAbortError(result.reason)) throw result.reason;
    else errors.push(result.reason);
  }
  return {
    rows: rows.map((row) => {
      const id = getEntityId(row);
      return results.reduce<Row>(
        (merged, fields) => ({ ...merged, ...(id != null ? fields.get(id) : undefined) }),
        { ...row }
      );
    }),
    errors,
  };
};

const getEnrichKey = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  chunk: readonly Row[]
) =>
  [
    'entity-grid',
    getKeyScope(options),
    'enrich',
    {
      ...getViewKey(context, options),
      sortDirection: options.sortDirection,
      entityIds: getEntityIds(chunk).join('\0'),
      anomalyJobIds: context.anomalyJobIds.join('\0'),
      columnIds: options.columnIds.join('\0'),
    },
  ] as const;

const fetchEnrichedChunk = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  chunk: readonly Row[],
  signal?: AbortSignal
): Promise<EnrichedRows> => {
  const ready = getReadyContext(context);
  if (!ready) return Promise.resolve({ rows: [], errors: [] });
  return fetchEnrichedRows(
    chunk,
    buildQueryArgs(ready, options),
    { runQuery: createEsqlRunner(context.searchService, signal), http: context.http, signal },
    getPageEnrichers(options.rowsMode, options.columnIds)
  );
};

/** Rows come from the rows query, so a refetch shows fresh fields; computed columns match by entity id. */
export const getLoadedRows = (
  chunks: ReadonlyArray<{ rows: readonly Row[]; enriched?: readonly Row[] }>
): Row[] =>
  chunks.flatMap(({ rows, enriched }) => {
    if (!enriched) return [...rows];
    const enrichedById = new Map(enriched.map((row) => [getEntityId(row), row]));
    return rows.map((row) => ({ ...enrichedById.get(getEntityId(row)), ...row }));
  });

const canEnrich = (context: GridContext, isPreviousData: boolean): boolean =>
  getReadyContext(context) != null && !isPreviousData && !context.isAnomalyJobsLoading;

const getEnrichQuery = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  chunk: readonly Row[]
) => ({
  queryKey: getEnrichKey(context, options, chunk),
  queryFn: ({ signal }: QueryFunctionContext) =>
    fetchEnrichedChunk(context, options, chunk, signal),
  staleTime: ENRICH_STALE_TIME_MS,
});

/** With `enrichRowsInView` these only read the cache; `onRowsInViewChange` fills it. */
const useEnrichQueries = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  chunks: ReadonlyArray<readonly Row[]>,
  isPreviousData: boolean,
  enrichRowsInView: boolean
) =>
  useQueries({
    queries: chunks.map((chunk) => ({
      ...getEnrichQuery(context, options, chunk),
      enabled: !enrichRowsInView && canEnrich(context, isPreviousData),
    })),
  });

/** Not state: a new range re-renders nothing, only the data it fetches does. */
const useEnrichRowsInView = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  chunks: ReadonlyArray<readonly Row[]>,
  isPreviousData: boolean
) =>
  useCallback(
    (firstRow: number, lastRow: number) => {
      if (!canEnrich(context, isPreviousData)) return;
      chunks
        .slice(
          Math.floor(firstRow / ENRICH_CHUNK_SIZE),
          Math.floor(lastRow / ENRICH_CHUNK_SIZE) + 1
        )
        .forEach((chunk) => {
          void context.queryClient.prefetchQuery(getEnrichQuery(context, options, chunk));
        });
    },
    [context, options, chunks, isPreviousData]
  );

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
  chunks: ReadonlyArray<readonly Row[]>,
  enrichQueries: ReadonlyArray<UseQueryResult<EnrichedRows>>
) => {
  const enrichedRows = useStableArray(enrichQueries.map(({ data }) => data?.rows));
  return useMemo(
    () => getLoadedRows(chunks.map((rows, i) => ({ rows, enriched: enrichedRows[i] }))),
    [chunks, enrichedRows]
  );
};

/** Chunks keyed on entity ids, so a refetch with the same rows keeps showing their columns. */
export const useEntityGridRowsEnrichment = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  loadedRows: readonly Row[] | undefined,
  isPreviousData: boolean,
  enrichRowsInView: boolean
) => {
  const chunks = useMemo(() => toChunks(loadedRows ?? [], ENRICH_CHUNK_SIZE), [loadedRows]);
  const enrichQueries = useEnrichQueries(
    context,
    options,
    chunks,
    isPreviousData,
    enrichRowsInView
  );
  const onRowsInViewChange = useEnrichRowsInView(context, options, chunks, isPreviousData);
  const rows = useLoadedRows(chunks, enrichQueries);
  // Columns whose enricher failed show no value; say so, as an empty cell also means none.
  useErrorToast(
    ENRICH_ERROR_TITLE,
    enrichQueries.find(({ data }) => data?.errors.length)?.data?.errors[0]
  );

  return {
    rows,
    onRowsInViewChange,
    // Computed cells of a chunk stay blank, rather than empty, until its enrich data arrives.
    isEnriching: enrichQueries.some(({ data, isFetching }) => data == null && isFetching),
    isFetching: enrichQueries.some((q) => q.isFetching),
    dataUpdatedAt: Math.max(0, ...enrichQueries.map((q) => q.dataUpdatedAt)),
    error: enrichQueries.find((q) => q.error)?.error,
  };
};
