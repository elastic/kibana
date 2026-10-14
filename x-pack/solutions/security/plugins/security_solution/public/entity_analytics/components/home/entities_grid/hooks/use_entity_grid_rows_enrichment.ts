/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useQueries } from '@kbn/react-query';
import type { QueryFunctionContext, UseQueryResult } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { isAbortError } from '../../../../../common/utils/exceptions';
import type { QueryArgs, Row } from '../common';
import { getEntityId, getEntityIds } from '../common';
import { PAGE_ENRICHERS } from '../grid_columns';
import { createEsqlRunner } from '../queries/esql';
import type { EnrichedFields, PageEnricher, RunContext } from '../queries/types';
import {
  buildQueryArgs,
  getKeyScope,
  getReadyContext,
  getViewKey,
} from './use_entity_grid_context';
import type { GridContext, RowsBatch, UseEntityGridDataOptions } from './use_entity_grid_context';

const ENRICH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.entitiesGrid.enrichError',
  { defaultMessage: 'Some columns of the entities table could not be loaded' }
);

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

const getEnrichKey = (context: GridContext, options: UseEntityGridDataOptions, batch: RowsBatch) =>
  [
    'entity-grid',
    getKeyScope(options),
    'enrich',
    {
      ...getViewKey(context, options),
      sortDirection: options.sortDirection,
      entityIds: getEntityIds(batch.rows).join('\0'),
      anomalyJobIds: context.anomalyJobIds.join('\0'),
    },
  ] as const;

/** The computed columns of a batch's rows. */
const fetchEnrichedBatch = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  batch: RowsBatch,
  signal?: AbortSignal
): Promise<EnrichedRows> => {
  const ready = getReadyContext(context);
  if (!ready) return Promise.resolve({ rows: [], errors: [] });
  return fetchEnrichedRows(
    batch.rows,
    buildQueryArgs(ready, options, null),
    { runQuery: createEsqlRunner(context.searchService, signal), http: context.http, signal },
    PAGE_ENRICHERS[options.rowsMode]
  );
};

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
        getReadyContext(context) != null &&
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

/**
 * The computed columns of the loaded batches: each batch's enrichers run after its rows arrive,
 * keyed on the batch's entity ids, so a refetch with the same rows keeps showing them while it
 * runs.
 */
export const useEntityGridRowsEnrichment = (
  context: GridContext,
  options: UseEntityGridDataOptions,
  batches: readonly RowsBatch[],
  isPreviousData: boolean
) => {
  const enrichQueries = useEnrichQueries(context, options, batches, isPreviousData);
  const rows = useLoadedRows(batches, enrichQueries);
  // Columns whose enricher failed show no value; say so, as an empty cell also means none.
  useErrorToast(
    ENRICH_ERROR_TITLE,
    enrichQueries.find(({ data }) => data?.errors.length)?.data?.errors[0]
  );

  return {
    rows,
    // Computed cells of a batch stay blank, rather than empty, until its enrich data arrives.
    isEnriching: enrichQueries.some(({ data, isFetching }) => data == null && isFetching),
    isFetching: enrichQueries.some((q) => q.isFetching),
    dataUpdatedAt: Math.max(0, ...enrichQueries.map((q) => q.dataUpdatedAt)),
    error: enrichQueries.find((q) => q.error)?.error,
  };
};
