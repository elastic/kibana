/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import type { RowsMode } from '../common';
import { QUERY_SPECS, isGridColumnId } from '../grid_columns';
import { nativeSortQuerySpec } from '../queries/native';
import type { EntityGridLoadState } from './use_entity_grid_data';

/**
 * Kibana's shared performance event, the one `reportPerformanceMetricEvent` from `@kbn/ebt-tools`
 * sends, as the Needs attention tiles do. Sent directly, to keep that package out of the plugin's
 * dependencies.
 */
const PERFORMANCE_METRIC_EVENT_TYPE = 'performance_metric';
export const GRID_LOADED_EVENT_NAME = 'entity_analytics_grid_loaded';

/** A column the entities index sorts by itself is fast; any other sort is computed by a query. */
export const getSortType = (sortField: string): 'fast' | 'computed' =>
  isGridColumnId(sortField) && QUERY_SPECS[sortField] === nativeSortQuerySpec ? 'fast' : 'computed';

/** What the grid reports about a load, besides its times. No entity ids, names or counts. */
export interface GridLoadMeta {
  rowsMode: RowsMode;
  sortField: string;
  timeRange: string;
  hasTileFilter: boolean;
  hasEntityFilters: boolean;
  isAtLoadLimit: boolean;
}

interface LoadRun {
  key: string;
  start: number;
  rows?: number;
  count?: number;
  enrichment?: number;
  isReported: boolean;
}

type LoadOutcome = 'ok' | 'failed' | 'abandoned';

const elapsedSince = (start: number) => Math.round(performance.now() - start);

const toEvent = (run: LoadRun, outcome: LoadOutcome, duration: number, meta: GridLoadMeta) => ({
  eventName: GRID_LOADED_EVENT_NAME,
  duration,
  // A phase that never settled (blocked by a failure, or left behind) ends with the load.
  key1: 'time_to_rows',
  value1: run.rows ?? duration,
  key2: 'time_to_count',
  value2: run.count ?? duration,
  meta: {
    outcome,
    rows_mode: meta.rowsMode,
    sort_column: meta.sortField,
    sort_type: getSortType(meta.sortField),
    has_tile_filter: meta.hasTileFilter,
    has_entity_filters: meta.hasEntityFilters,
    is_at_load_limit: meta.isAtLoadLimit,
    time_range: meta.timeRange,
  },
});

/**
 * Reports one `performance_metric` event per grid load, and again for each new sort, rows mode,
 * filter, search or range (`runKey`), once the rows, the count and the computed columns of the
 * first rows in view have settled: how long the grid took, how long its rows and its count took,
 * and whether a query failed. A failed load is reported once nothing is fetching any more.
 * While the filters it needs resolve (`isFilterPending`), the load is timed but can't settle.
 * A load left before it settled (a new `runKey`, or the grid unmounted) is reported as
 * `abandoned` with its time so far: the slowest loads are the ones people give up on.
 * Successes are reported too: they are the baseline a slow space stands out against.
 */
export const useGridLoadTelemetry = ({
  skip,
  runKey,
  isFilterPending,
  loadState,
  isFetching,
  meta,
}: {
  skip: boolean;
  runKey: string;
  isFilterPending: boolean;
  loadState: EntityGridLoadState;
  isFetching: boolean;
  meta: GridLoadMeta;
}): void => {
  const { analytics } = useKibana().services;
  const run = useRef<LoadRun>();
  // The meta the current run started with, for a run reported only once it is left behind.
  const runMeta = useRef(meta);

  const reportAbandoned = useCallback(() => {
    const current = run.current;
    if (!current || current.isReported) return;
    current.isReported = true;
    analytics?.reportEvent(
      PERFORMANCE_METRIC_EVENT_TYPE,
      toEvent(current, 'abandoned', elapsedSince(current.start), runMeta.current)
    );
  }, [analytics]);

  // Leaving the page, or switching to Group by, abandons a load that hasn't settled.
  useEffect(() => reportAbandoned, [reportAbandoned]);

  useEffect(() => {
    if (skip) return;
    if (run.current?.key !== runKey) {
      reportAbandoned();
      run.current = { key: runKey, start: performance.now(), isReported: false };
    }
    runMeta.current = meta;
    const current = run.current;
    if (current.isReported || isFilterPending) return;

    const { isRowsPending, isCountPending, isEnrichPending, hasError } = loadState;
    if (current.rows === undefined && !isRowsPending) {
      current.rows = elapsedSince(current.start);
    }
    if (current.count === undefined && !isCountPending) {
      current.count = elapsedSince(current.start);
    }
    // The computed columns are read only once the rows are in.
    if (current.rows !== undefined && current.enrichment === undefined && !isEnrichPending) {
      current.enrichment = elapsedSince(current.start);
    }

    const isSettled = current.count !== undefined && current.enrichment !== undefined;
    const hasFailed = hasError && !isFetching;
    if (!isSettled && !hasFailed) return;

    current.isReported = true;
    const duration = isSettled
      ? Math.max(current.count ?? 0, current.enrichment ?? 0)
      : elapsedSince(current.start);
    analytics?.reportEvent(
      PERFORMANCE_METRIC_EVENT_TYPE,
      toEvent(current, hasError ? 'failed' : 'ok', duration, meta)
    );
  });
};
