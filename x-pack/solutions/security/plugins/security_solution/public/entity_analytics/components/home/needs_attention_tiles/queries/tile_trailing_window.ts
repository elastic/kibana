/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../use_time_range_param';

interface TrailingWindowConfig {
  stepHours: number;
  dots: number;
}

/** Hours between two dots and the number of dots for each time range. */
export const TRAILING_WINDOW: Record<TimeRange, TrailingWindowConfig> = {
  '24h': { stepHours: 1, dots: 24 },
  '7d': { stepHours: 6, dots: 28 },
  '30d': { stepHours: 24, dots: 30 },
};

export const TRAILING_BUCKET_COLUMN = 'bucket';

/** Returns the STATS BY grouping that numbers buckets in whole steps back from NOW(), 0 being the newest. */
export const trailingBucketGrouping = (timeRange: TimeRange): string =>
  `${TRAILING_BUCKET_COLUMN} = DATE_DIFF("hour", @timestamp, NOW()) / ${TRAILING_WINDOW[timeRange].stepHours}`;

/** Returns how many hours back a query must read for the oldest dot to cover a full window. */
export const trailingFetchHours = (timeRange: TimeRange): number => {
  const { stepHours, dots } = TRAILING_WINDOW[timeRange];
  return (2 * dots - 1) * stepHours;
};
