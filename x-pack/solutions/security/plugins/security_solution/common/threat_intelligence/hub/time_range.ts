/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Quick-range presets for the Intelligence Hub dashboard (no custom date picker). */
export const TIME_RANGE_PRESET_IDS = ['24h', '7d', '30d', '90d'] as const;

export type TimeRangePresetId = (typeof TIME_RANGE_PRESET_IDS)[number];

export const DEFAULT_TIME_RANGE_PRESET: TimeRangePresetId = '7d';

const PRESET_DURATION_MS: Record<TimeRangePresetId, number> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
};

export interface ResolvedTimeRange {
  readonly from: string;
  readonly to: string;
}

export const isTimeRangePresetId = (value: string): value is TimeRangePresetId =>
  (TIME_RANGE_PRESET_IDS as readonly string[]).includes(value);

/**
 * Resolve a quick-range preset to ISO `from` / `to` bounds for the dashboard
 * overview API. `to` is always `now` at resolution time so manual refresh
 * slides the window forward with the clock.
 */
export const resolveTimeRangeFromPreset = (
  preset: TimeRangePresetId,
  nowMs: number = Date.now()
): ResolvedTimeRange => {
  const to = new Date(nowMs).toISOString();
  const from = new Date(nowMs - PRESET_DURATION_MS[preset]).toISOString();
  return { from, to };
};

/**
 * Prior window of equal length ending at the current `from`.
 * Used for Hub stats-ribbon "vs prior period" comparisons.
 */
export const resolvePriorTimeRange = (fromIso: string, toIso: string): ResolvedTimeRange => {
  const fromMs = Date.parse(fromIso);
  const toMs = Date.parse(toIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    throw new Error(`resolvePriorTimeRange: invalid range ${fromIso} → ${toIso}`);
  }
  const durationMs = toMs - fromMs;
  return {
    from: new Date(fromMs - durationMs).toISOString(),
    to: fromIso,
  };
};

/**
 * Percent change for Hub stats ribbon vs prior period.
 * Matches design: 0/0 → 0, new activity from empty prior → 100, else rounded ratio.
 */
export const percentChangeVsPrior = (current: number, prior: number): number => {
  if (prior === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - prior) / prior) * 100);
};
