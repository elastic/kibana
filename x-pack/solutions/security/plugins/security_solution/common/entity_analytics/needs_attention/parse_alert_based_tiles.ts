/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from './time_range';
import { TRAILING_WINDOW } from './tile_trailing_window';
import {
  trailingAlertsColumn,
  trailingWatchlistedColumn,
} from './entities_with_alerts_trailing_series_query';

export interface AlertBasedTilesResult {
  alertsCount: number;
  alertsEntityIds: string[];
  watchlistedCount: number;
  watchlistedEntityIds: string[];
}

export const parseAlertBasedTilesResponse = (raw: ESQLSearchResponse): AlertBasedTilesResult => {
  const row = raw.values?.[0];
  if (!row)
    return { alertsCount: 0, alertsEntityIds: [], watchlistedCount: 0, watchlistedEntityIds: [] };

  const col = (name: string) => raw.columns?.findIndex((c) => c.name === name) ?? -1;
  const toIds = (idx: number): string[] => {
    if (idx < 0) return [];
    const v = row[idx];
    if (Array.isArray(v)) return (v as string[]).filter(Boolean);
    if (typeof v === 'string' && v) return [v];
    return [];
  };

  return {
    alertsCount:
      typeof row[col('alerts_count')] === 'number' ? (row[col('alerts_count')] as number) : 0,
    alertsEntityIds: toIds(col('alerts_entity_ids')),
    watchlistedCount:
      typeof row[col('watchlisted_count')] === 'number'
        ? (row[col('watchlisted_count')] as number)
        : 0,
    watchlistedEntityIds: toIds(col('watchlisted_entity_ids')),
  };
};

export interface AlertBasedTilesTrend {
  /** Entities with alerts, one value per dot, oldest first; the last one is the tile's number. */
  alerts: number[];
  /** Watchlisted, one value per dot, oldest first; the last one is the tile's number. */
  watchlisted: number[];
}

/**
 * Reads the single result row into oldest-first dots. A missing or null column counts as 0, and
 * an empty response gives all zeros.
 */
export const parseAlertBasedTilesTrend = (
  raw: ESQLSearchResponse,
  timeRange: TimeRange
): AlertBasedTilesTrend => {
  const { dots } = TRAILING_WINDOW[timeRange];
  const row = raw.values?.[0];

  const dotValues = (columnOf: (k: number) => string): number[] =>
    Array.from({ length: dots }, (_, i) => {
      const k = dots - 1 - i;
      const index = raw.columns?.findIndex((c) => c.name === columnOf(k)) ?? -1;
      const value = index < 0 ? undefined : row?.[index];
      return typeof value === 'number' ? value : 0;
    });

  return {
    alerts: dotValues(trailingAlertsColumn),
    watchlisted: dotValues(trailingWatchlistedColumn),
  };
};
