/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TimeRange } from './time_range';
import { TRAILING_BUCKET_COLUMN, TRAILING_WINDOW } from './tile_trailing_window';

/**
 * Returns the `WHERE` clause that restricts an aggregate to the buckets of dot `k` (0 = newest):
 * the selected time range, ending `k` steps back.
 */
export const trailingDotFilter = (timeRange: TimeRange, k: number): string =>
  `WHERE ${TRAILING_BUCKET_COLUMN} >= ${k} AND ${TRAILING_BUCKET_COLUMN} <= ${
    k + TRAILING_WINDOW[timeRange].dots - 1
  }`;

/**
 * Reads the single result row of a trailing-window query into oldest-first dots, taking dot `k`
 * from the column `columnOf(k)`. A missing or null column counts as 0, and an empty response
 * gives all zeros.
 */
export const parseTrailingDots = (
  raw: ESQLSearchResponse,
  timeRange: TimeRange,
  columnOf: (k: number) => string
): number[] => {
  const { dots } = TRAILING_WINDOW[timeRange];
  const row = raw.values?.[0];
  return Array.from({ length: dots }, (_, i) => {
    const index = raw.columns?.findIndex((c) => c.name === columnOf(dots - 1 - i)) ?? -1;
    const value = index < 0 ? undefined : row?.[index];
    return typeof value === 'number' ? value : 0;
  });
};
