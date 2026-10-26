/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from '../../entities_grid/common';
import { TIME_RANGE_DAYS } from './tile_period';

/**
 * Hours between two dots of the sparkline of each time range: 6 dots for every range. Each dot is
 * the count over the range ending that many hours ago, so fewer dots read fewer buckets without
 * changing the value of any dot.
 */
const SERIES_STEP_HOURS: Record<TimeRange, number> = { '24h': 4, '7d': 28, '30d': 120 };

/** The column that holds the bucket of an alert, set by the alert pipeline. */
export const SERIES_BUCKET_COLUMN = 'bucket';

interface SeriesWindow {
  stepHours: number;
  dots: number;
}

/** Returns the hours between two dots and the number of dots, which together cover the range. */
export const getSeriesWindow = (timeRange: TimeRange): SeriesWindow => {
  const stepHours = SERIES_STEP_HOURS[timeRange];
  return { stepHours, dots: (TIME_RANGE_DAYS[timeRange] * 24) / stepHours };
};

/** Returns how many hours back a query must read for the oldest dot to cover a full window. */
export const seriesFetchHours = (timeRange: TimeRange): number => {
  const { stepHours, dots } = getSeriesWindow(timeRange);
  return (2 * dots - 1) * stepHours;
};

/**
 * Returns the expression that numbers buckets in whole steps back from NOW(), 0 being the newest,
 * from `timeField` (the alert or anomaly @timestamp, or the entity's first_seen).
 */
export const buildSeriesBucketExpression = (
  timeRange: TimeRange,
  timeField: string = '@timestamp'
): string => `DATE_DIFF("hour", ${timeField}, NOW()) / ${getSeriesWindow(timeRange).stepHours}`;

/** Returns the condition that keeps the buckets of dot `k` (0 = newest): the range ending `k` steps back. */
export const buildSeriesDotWindow = (timeRange: TimeRange, k: number): string =>
  `${SERIES_BUCKET_COLUMN} >= ${k} AND ${SERIES_BUCKET_COLUMN} <= ${
    k + getSeriesWindow(timeRange).dots - 1
  }`;

/**
 * Reads the single result row of a series query into oldest-first dots, taking dot `k` from the
 * column `columnOf(k)`. A null value is 0; a missing column throws, so the sparkline is left out
 * rather than drawn from a wrong column.
 */
export const readSeriesDots = (
  raw: ESQLSearchResponse,
  timeRange: TimeRange,
  columnOf: (k: number) => string
): number[] => {
  const row = raw.values?.[0];
  if (!row) throw new Error('The ES|QL series response has no row');
  const { dots } = getSeriesWindow(timeRange);
  return Array.from({ length: dots }, (_, i) => {
    const column = columnOf(dots - 1 - i);
    const index = raw.columns?.findIndex((c) => c.name === column) ?? -1;
    if (index < 0) throw new Error(`The ES|QL series response has no "${column}" column`);
    const value = row[index];
    return typeof value === 'number' ? value : 0;
  });
};
