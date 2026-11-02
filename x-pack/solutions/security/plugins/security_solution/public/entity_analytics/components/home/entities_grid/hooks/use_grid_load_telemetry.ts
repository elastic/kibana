/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
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

const elapsedSince = (start: number) => Math.round(performance.now() - start);

/**
 * Reports one `performance_metric` event per grid load, and again for each new sort, rows mode,
 * filter, search or range (`runKey`), once the rows, the count and the computed columns of the
 * first rows in view have settled: how long the grid took, how long its rows and its count took,
 * and whether a query failed. A failed load is reported once nothing is fetching any more.
 * Successes are reported too: they are the baseline a slow space stands out against.
 */
export const useGridLoadTelemetry = ({
  skip,
  runKey,
  loadState,
  isFetching,
  meta,
}: {
  skip: boolean;
  runKey: string;
  loadState: EntityGridLoadState;
  isFetching: boolean;
  meta: GridLoadMeta;
}): void => {
  const { analytics } = useKibana().services;
  const run = useRef<LoadRun>();

  useEffect(() => {
    if (skip) return;
    if (run.current?.key !== runKey) {
      run.current = { key: runKey, start: performance.now(), isReported: false };
    }
    const current = run.current;
    if (current.isReported) return;

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
    // A query that waited on a failed one never settles: it ends with the load.
    const duration = isSettled
      ? Math.max(current.count ?? 0, current.enrichment ?? 0)
      : elapsedSince(current.start);
    analytics?.reportEvent(PERFORMANCE_METRIC_EVENT_TYPE, {
      eventName: GRID_LOADED_EVENT_NAME,
      duration,
      key1: 'time_to_rows',
      value1: current.rows ?? duration,
      key2: 'time_to_count',
      value2: current.count ?? duration,
      meta: {
        outcome: hasError ? 'failed' : 'ok',
        rows_mode: meta.rowsMode,
        sort_column: meta.sortField,
        sort_type: getSortType(meta.sortField),
        has_tile_filter: meta.hasTileFilter,
        has_entity_filters: meta.hasEntityFilters,
        is_at_load_limit: meta.isAtLoadLimit,
        time_range: meta.timeRange,
      },
    });
  });
};
