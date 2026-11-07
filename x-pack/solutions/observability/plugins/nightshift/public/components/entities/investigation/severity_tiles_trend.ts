/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';

/** Issue #1346: investigations over the last 72 hours, timed by when they were opened. */
export const SEVERITY_TREND_WINDOW_MS = 72 * 60 * 60 * 1000;

/** One point per hour. */
const BUCKET_MS = 60 * 60 * 1000;

export interface SeverityTrendPoint {
  time: number;
  value: number;
}

const parseMs = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Prefer created_at — that is when the investigation was opened. */
export const openedAtMs = (investigation: InvestigationSummary): number | null =>
  parseMs(investigation.created_at) ?? parseMs(investigation.updated_at);

/** Relative age for the left sparkline axis (prototype: “3 hr ago”). */
export const formatSeverityTrendAgeLabel = (ageMs: number): string => {
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (ageMs < minute) {
    return 'Just now';
  }
  if (ageMs < hour) {
    const minutes = Math.max(1, Math.round(ageMs / minute));
    return `${minutes} min ago`;
  }
  if (ageMs < day) {
    const hours = Math.max(1, Math.round(ageMs / hour));
    return `${hours} hr ago`;
  }
  const days = Math.max(1, Math.round(ageMs / day));
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/**
 * Running count of investigations opened (`created_at`) for one severity over
 * the last 72 hours. Opens before the window count toward the baseline so older
 * investigations still shape the sparkline. Includes every status.
 * The last point snaps to `currentCount` so the chart lands on the tile number.
 */
export const buildSeverityTrendSeries = ({
  investigations,
  currentCount,
  nowMs = Date.now(),
}: {
  investigations: readonly InvestigationSummary[];
  currentCount: number;
  nowMs?: number;
}): SeverityTrendPoint[] => {
  const startMs = nowMs - SEVERITY_TREND_WINDOW_MS;
  const openedTimes = investigations
    .map(openedAtMs)
    .filter((ms): ms is number => ms != null)
    .sort((a, b) => a - b);

  const openedBy = (timeMs: number): number => {
    let count = 0;
    for (const openedMs of openedTimes) {
      if (openedMs > timeMs) {
        break;
      }
      count += 1;
    }
    return count;
  };

  const points: SeverityTrendPoint[] = [];
  for (let timeMs = startMs; timeMs <= nowMs; timeMs += BUCKET_MS) {
    points.push({ time: timeMs, value: openedBy(timeMs) });
  }

  if (points.length === 0) {
    return [
      { time: startMs, value: openedBy(startMs) },
      { time: nowMs, value: currentCount },
    ];
  }

  // Endpoint is the live tile count so the sparkline lands on the number above it.
  points[points.length - 1] = { time: nowMs, value: currentCount };
  return points;
};

/** Left axis label: earliest opening in-window, else the full 72h span. */
export const formatSeverityTrendStartLabel = ({
  investigations,
  nowMs = Date.now(),
}: {
  investigations: readonly InvestigationSummary[];
  nowMs?: number;
}): string => {
  const startMs = nowMs - SEVERITY_TREND_WINDOW_MS;
  let earliestMs: number | null = null;
  for (const investigation of investigations) {
    const openedMs = openedAtMs(investigation);
    if (openedMs == null || openedMs < startMs || openedMs > nowMs) {
      continue;
    }
    if (earliestMs == null || openedMs < earliestMs) {
      earliestMs = openedMs;
    }
  }
  return formatSeverityTrendAgeLabel(nowMs - (earliestMs ?? startMs));
};
