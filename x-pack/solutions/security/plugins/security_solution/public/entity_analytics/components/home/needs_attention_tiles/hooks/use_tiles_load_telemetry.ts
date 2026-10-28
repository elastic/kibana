/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';

/**
 * Kibana's shared performance event, the one `reportPerformanceMetricEvent` from `@kbn/ebt-tools`
 * sends (Dashboard reports its load with it). Sent directly, to keep that package out of the
 * plugin's dependencies.
 */
const PERFORMANCE_METRIC_EVENT_TYPE = 'performance_metric';
export const TILES_LOADED_EVENT_NAME = 'entity_analytics_tiles_loaded';

/** What a tile has left to load. The delta follows the count, and the sparkline the delta. */
export interface TileLoadState {
  isCountPending: boolean;
  isDeltaLoading: boolean;
  isTrendLoading: boolean;
  isTimedOut: boolean;
  hasError: boolean;
}

interface TileTimes {
  count?: number;
  delta?: number;
  sparkline?: number;
}

interface LoadRun {
  key: string;
  start: number;
  tiles: Record<string, TileTimes>;
  isReported: boolean;
}

const elapsedSince = (start: number) => Math.round(performance.now() - start);

/**
 * Reports one `performance_metric` event per page load, and again for each new range or filter
 * (`runKey`), once every tile's count, delta and sparkline has settled: how long the page took,
 * how long the counts took, and how many counts timed out or failed, with each tile's times in
 * `meta`. Successes are reported too: they are the baseline a slow space stands out against.
 * No entity ids, names or counts are sent.
 */
export const useTilesLoadTelemetry = ({
  skip,
  runKey,
  timeRange,
  hasEntityFilters,
  tiles,
}: {
  skip: boolean;
  runKey: string;
  timeRange: string;
  hasEntityFilters: boolean;
  tiles: Record<string, TileLoadState>;
}): void => {
  const { analytics } = useKibana().services;
  const run = useRef<LoadRun>();

  useEffect(() => {
    if (skip) return;
    if (run.current?.key !== runKey) {
      run.current = { key: runKey, start: performance.now(), tiles: {}, isReported: false };
    }
    const current = run.current;
    if (current.isReported) return;

    Object.entries(tiles).forEach(([tile, state]) => {
      const times = current.tiles[tile] ?? {};
      current.tiles[tile] = times;
      if (times.count === undefined && !state.isCountPending) {
        times.count = elapsedSince(current.start);
      }
      if (times.count !== undefined && times.delta === undefined && !state.isDeltaLoading) {
        times.delta = elapsedSince(current.start);
      }
      if (times.delta !== undefined && times.sparkline === undefined && !state.isTrendLoading) {
        times.sparkline = elapsedSince(current.start);
      }
    });

    const allTimes = Object.values(current.tiles);
    if (allTimes.some((times) => times.sparkline === undefined)) return;

    current.isReported = true;
    const states = Object.values(tiles);
    analytics?.reportEvent(PERFORMANCE_METRIC_EVENT_TYPE, {
      eventName: TILES_LOADED_EVENT_NAME,
      duration: Math.max(...allTimes.map((times) => times.sparkline ?? 0)),
      key1: 'time_to_counts',
      value1: Math.max(...allTimes.map((times) => times.count ?? 0)),
      key2: 'count_timeouts',
      value2: states.filter((state) => state.isTimedOut).length,
      key3: 'count_errors',
      value3: states.filter((state) => state.hasError && !state.isTimedOut).length,
      meta: { time_range: timeRange, has_entity_filters: hasEntityFilters, tiles: current.tiles },
    });
  });
};
