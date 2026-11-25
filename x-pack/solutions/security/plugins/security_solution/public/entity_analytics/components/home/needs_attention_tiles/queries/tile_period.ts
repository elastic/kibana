/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_DAYS, buildLookback, type TimeRange } from '../../queries/time_range';

/** The selected time range ending now, or the same-length range right before it. */
export type TilePeriod = 'current' | 'previous';

/**
 * Returns the ES|QL condition that keeps `field` inside the period. The current period is
 * `field >= NOW() - range`; the previous one is `[NOW() - 2 x range, NOW() - range)`.
 */
export const buildPeriodCondition = (
  field: string,
  timeRange: TimeRange,
  period: TilePeriod = 'current'
): string =>
  period === 'current'
    ? `${field} >= ${buildLookback(timeRange)}`
    : `${field} >= NOW() - ${2 * TIME_RANGE_DAYS[timeRange]} days AND ${field} < ${buildLookback(
        timeRange
      )}`;

/** Returns where the previous period starts: `NOW() - 2 x range`. */
export const buildPreviousPeriodStart = (timeRange: TimeRange): string =>
  `NOW() - ${2 * TIME_RANGE_DAYS[timeRange]} days`;
