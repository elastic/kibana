/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default global time range for prototype v.7 (“Last 30 days”).
 * Older prototypes keep Alerts/Discover-style “Today” (`now/d`–`now/d`).
 */
export const FACELIFT_V7_DEFAULT_FROM = 'now-30d' as const;
export const FACELIFT_V7_DEFAULT_TO = 'now' as const;

/** Number of daily points used for metric sparklines in v.7. */
export const FACELIFT_V7_TREND_DAYS = 30;

export type FaceliftTimeRangeId = '24h' | '7d' | '30d';

export interface FaceliftTimeRange {
  id: FaceliftTimeRangeId;
  /** Button copy in the KQL-bar control (replaces the super date picker in v.7). */
  label: string;
  /** Applied to the global time range so the rest of the app follows the preset. */
  from: string;
  to: string;
  /** Sparkline samples: hourly for 24h, daily for the wider windows. */
  trendPoints: number;
  /** Trailing copy for card filter pills, e.g. “in last 7 days”. */
  windowLabel: string;
}

/**
 * The three presets v.7 offers instead of a free-form date picker. Ordered
 * narrowest first, which is also the button order.
 */
export const FACELIFT_TIME_RANGES: Record<FaceliftTimeRangeId, FaceliftTimeRange> = {
  '24h': {
    id: '24h',
    label: 'Last 24h',
    from: 'now-24h',
    to: 'now',
    trendPoints: 24,
    windowLabel: 'in last 24 hours',
  },
  '7d': {
    id: '7d',
    label: 'Last 7d',
    from: 'now-7d',
    to: 'now',
    trendPoints: 7,
    windowLabel: 'in last 7 days',
  },
  '30d': {
    id: '30d',
    label: 'Last 30d',
    from: FACELIFT_V7_DEFAULT_FROM,
    to: FACELIFT_V7_DEFAULT_TO,
    trendPoints: FACELIFT_V7_TREND_DAYS,
    windowLabel: 'in last 30 days',
  },
};

export const FACELIFT_TIME_RANGE_IDS: FaceliftTimeRangeId[] = ['24h', '7d', '30d'];

/** Matches the range the home page pushes into the global picker on mount. */
export const DEFAULT_FACELIFT_TIME_RANGE: FaceliftTimeRangeId = '30d';

/**
 * Stretch a short mock trend series to `sampleCount` evenly spaced samples, so
 * one designed shape can render at any of the preset window granularities.
 */
export const expandTrend = (points: number[], sampleCount: number): number[] => {
  if (points.length === 0) {
    return [];
  }
  if (points.length >= sampleCount) {
    return points.slice(-sampleCount);
  }

  const lastIndex = points.length - 1;
  const result: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = (i / (sampleCount - 1)) * lastIndex;
    const i0 = Math.floor(t);
    const i1 = Math.min(i0 + 1, lastIndex);
    const frac = t - i0;
    result.push(Math.round(points[i0] * (1 - frac) + points[i1] * frac));
  }
  return result;
};

/**
 * Stretch a short mock trend series to {@link FACELIFT_V7_TREND_DAYS} daily
 * samples so sparklines match the Last-30-days picker.
 */
export const expandTrendToThirtyDays = (points: number[]): number[] =>
  expandTrend(points, FACELIFT_V7_TREND_DAYS);
