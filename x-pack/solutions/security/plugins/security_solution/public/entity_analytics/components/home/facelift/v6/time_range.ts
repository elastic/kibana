/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default global time range for prototype v.6 (“Last 30 days”).
 * Older prototypes keep Alerts/Discover-style “Today” (`now/d`–`now/d`).
 */
export const FACELIFT_V6_DEFAULT_FROM = 'now-30d' as const;
export const FACELIFT_V6_DEFAULT_TO = 'now' as const;

/** Number of daily points used for metric sparklines in v.6. */
export const FACELIFT_V6_TREND_DAYS = 30;

/**
 * Stretch a short mock trend series to {@link FACELIFT_V6_TREND_DAYS} daily
 * samples so sparklines match the Last-30-days picker.
 */
export const expandTrendToThirtyDays = (points: number[]): number[] => {
  if (points.length === 0) {
    return [];
  }
  if (points.length >= FACELIFT_V6_TREND_DAYS) {
    return points.slice(-FACELIFT_V6_TREND_DAYS);
  }

  const lastIndex = points.length - 1;
  const result: number[] = [];
  for (let i = 0; i < FACELIFT_V6_TREND_DAYS; i++) {
    const t = (i / (FACELIFT_V6_TREND_DAYS - 1)) * lastIndex;
    const i0 = Math.floor(t);
    const i1 = Math.min(i0 + 1, lastIndex);
    const frac = t - i0;
    result.push(Math.round(points[i0] * (1 - frac) + points[i1] * frac));
  }
  return result;
};
