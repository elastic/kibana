/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { RiskScoreHistoryEntry } from '../../../../common/api/entity_analytics';
import { getRiskLevel } from '../../../../common/entity_analytics/risk_engine/risk_levels';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/** Ranges ≤ 36h are treated as a single-day (hourly) view. */
export const HOURLY_VIEW_MAX_RANGE_MS = MS_PER_DAY * 1.5;

export type TimelineBucketInterval = '1d' | '1h';

export interface PreparedTimelineEntries {
  /** Points plotted on the chart. */
  chartEntries: RiskScoreHistoryEntry[];
  /** Observations used when snapping click → point-in-time / mock contributions. */
  selectableEntries: RiskScoreHistoryEntry[];
  /** Bucket interval used for densification / click behavior. */
  interval: TimelineBucketInterval;
}

export interface CurrentRiskScoreOverlay {
  calculated_score_norm: number;
  calculated_level?: RiskScoreHistoryEntry['calculated_level'];
}

/**
 * Drops trailing reset-to-zero maintainer writes, then expands sparse history
 * into daily or hourly points depending on the requested range.
 * When `currentScore` is provided (entity-store authoritative score from the
 * right flyout), the rightmost chart point is forced to that value.
 */
export const prepareTimelineEntries = (
  entries: RiskScoreHistoryEntry[],
  from: string,
  to: string,
  currentScore?: CurrentRiskScoreOverlay
): PreparedTimelineEntries => {
  const selectableReal = dropTrailingZeros(entries);
  const interval = resolveTimelineInterval(from, to);

  const rangeStart = dateMath.parse(from)?.valueOf();
  const rangeEnd = dateMath.parse(to, { roundUp: true })?.valueOf();
  if (rangeStart === undefined || rangeEnd === undefined || rangeEnd <= rangeStart) {
    return {
      chartEntries: applyCurrentScoreOverlay(selectableReal, currentScore),
      selectableEntries: selectableReal,
      interval,
    };
  }

  if (interval === '1h') {
    const baseScore =
      selectableReal[selectableReal.length - 1]?.calculated_score_norm ??
      currentScore?.calculated_score_norm ??
      50;
    const densified = densifyHourly(selectableReal, rangeStart, rangeEnd, baseScore);
    const chartEntries = applyCurrentScoreOverlay(densified, currentScore);
    // Every densified hour is clickable (API docs are sparse; mocks fill the day).
    return { chartEntries, selectableEntries: chartEntries, interval };
  }

  if (selectableReal.length === 0) {
    return { chartEntries: [], selectableEntries: [], interval };
  }

  const densified = densifyDaily(selectableReal, rangeStart, rangeEnd);
  return {
    chartEntries: applyCurrentScoreOverlay(densified, currentScore),
    selectableEntries: selectableReal,
    interval,
  };
};

export const resolveTimelineInterval = (from: string, to: string): TimelineBucketInterval => {
  const rangeStart = dateMath.parse(from)?.valueOf();
  const rangeEnd = dateMath.parse(to, { roundUp: true })?.valueOf();
  if (rangeStart === undefined || rangeEnd === undefined) {
    return '1d';
  }
  return rangeEnd - rangeStart <= HOURLY_VIEW_MAX_RANGE_MS ? '1h' : '1d';
};

const applyCurrentScoreOverlay = (
  entries: RiskScoreHistoryEntry[],
  currentScore?: CurrentRiskScoreOverlay
): RiskScoreHistoryEntry[] => {
  if (
    entries.length === 0 ||
    currentScore == null ||
    !Number.isFinite(currentScore.calculated_score_norm) ||
    currentScore.calculated_score_norm <= 0
  ) {
    return entries;
  }

  const level =
    currentScore.calculated_level ?? getRiskLevel(currentScore.calculated_score_norm);
  const last = entries[entries.length - 1];
  return [
    ...entries.slice(0, -1),
    {
      ...last,
      calculated_score_norm: currentScore.calculated_score_norm,
      calculated_level: level,
      calculated_score: currentScore.calculated_score_norm,
    },
  ];
};

export const dropTrailingZeros = (entries: RiskScoreHistoryEntry[]): RiskScoreHistoryEntry[] => {
  if (entries.length === 0) {
    return entries;
  }
  let end = entries.length;
  while (end > 1 && entries[end - 1].calculated_score_norm === 0) {
    end -= 1;
  }
  return end === entries.length ? entries : entries.slice(0, end);
};

/** Start of the calendar day in the user's local timezone. */
export const startOfLocalDay = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Start of the clock hour in the user's local timezone. */
export const startOfLocalHour = (ms: number): number => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
};

/** @deprecated Prefer {@link startOfLocalDay} — kept for daily densify UTC keys matching API buckets. */
export const startOfUtcDay = (ms: number): number => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/**
 * Walk each UTC day in [rangeStart, rangeEnd], carrying forward the latest known
 * score. Days without a real observation get a light deterministic wobble so the
 * chart reads as daily activity rather than a flat step between weekly seeds.
 * Each day's plotted value is the max score observed that day.
 */
const densifyDaily = (
  entries: RiskScoreHistoryEntry[],
  rangeStart: number,
  rangeEnd: number
): RiskScoreHistoryEntry[] => {
  const byDay = new Map<number, RiskScoreHistoryEntry>();
  for (const entry of entries) {
    const day = startOfUtcDay(toEpochMs(entry['@timestamp']));
    const existing = byDay.get(day);
    if (!existing || entry.calculated_score_norm >= existing.calculated_score_norm) {
      byDay.set(day, entry);
    }
  }

  const firstEntryDay = startOfUtcDay(toEpochMs(entries[0]['@timestamp']));
  const lastEntry = entries[entries.length - 1];
  const chartStart = Math.max(startOfUtcDay(rangeStart), firstEntryDay);
  const chartEnd = startOfUtcDay(Math.min(rangeEnd, Date.now()));

  if (chartEnd < chartStart) {
    return entries;
  }

  const densified: RiskScoreHistoryEntry[] = [];
  let carry = entries[0];

  for (let day = chartStart; day <= chartEnd; day += MS_PER_DAY) {
    const observed = byDay.get(day);
    if (observed) {
      carry = observed;
      densified.push({
        ...observed,
        '@timestamp': new Date(day).toISOString(),
      });
      continue;
    }

    const wobble = mockScoreWobble(carry.calculated_score_norm, day);
    densified.push({
      ...carry,
      '@timestamp': new Date(day).toISOString(),
      calculated_score_norm: wobble,
      calculated_level: getRiskLevel(wobble),
      calculated_score: wobble,
    });
  }

  if (densified.length > 0) {
    densified[densified.length - 1] = {
      ...lastEntry,
      '@timestamp': densified[densified.length - 1]['@timestamp'],
      calculated_score_norm: lastEntry.calculated_score_norm,
      calculated_level: lastEntry.calculated_level,
    };
  }

  return densified;
};

/**
 * Walk each local hour for the drilled-in day:
 * - Past days: 00:00 … 23:00 (24 points)
 * - Today: 00:00 … latest integer local hour
 * Sparse API data is filled by carry-forward with a small wobble so mornings
 * are never missing when the index only has afternoon docs.
 */
const densifyHourly = (
  entries: RiskScoreHistoryEntry[],
  rangeStart: number,
  rangeEnd: number,
  fallbackScore: number
): RiskScoreHistoryEntry[] => {
  const byHour = new Map<number, RiskScoreHistoryEntry>();
  for (const entry of entries) {
    const hour = startOfLocalHour(toEpochMs(entry['@timestamp']));
    const existing = byHour.get(hour);
    if (!existing || toEpochMs(entry['@timestamp']) >= toEpochMs(existing['@timestamp'])) {
      byHour.set(hour, entry);
    }
  }

  const now = Date.now();
  const dayStart = startOfLocalDay(rangeStart);
  const todayStart = startOfLocalDay(now);
  const isToday = dayStart === todayStart;
  const chartStart = dayStart;
  const chartEnd = isToday
    ? startOfLocalHour(Math.min(rangeEnd, now))
    : dayStart + 23 * MS_PER_HOUR;

  if (chartEnd < chartStart) {
    return entries;
  }

  const seedEntry: RiskScoreHistoryEntry =
    entries[0] ??
    ({
      '@timestamp': new Date(chartStart).toISOString(),
      calculated_score_norm: fallbackScore,
      calculated_level: getRiskLevel(fallbackScore),
      calculated_score: fallbackScore,
    } as RiskScoreHistoryEntry);

  const densified: RiskScoreHistoryEntry[] = [];
  let carry = seedEntry;

  for (let hour = chartStart; hour <= chartEnd; hour += MS_PER_HOUR) {
    const observed = byHour.get(hour);
    if (observed) {
      carry = observed;
      densified.push({
        ...observed,
        '@timestamp': new Date(hour).toISOString(),
      });
      continue;
    }

    const wobble = mockScoreWobble(carry.calculated_score_norm, hour / MS_PER_HOUR);
    densified.push({
      ...carry,
      '@timestamp': new Date(hour).toISOString(),
      calculated_score_norm: wobble,
      calculated_level: getRiskLevel(wobble),
      calculated_score: wobble,
    });
  }

  if (densified.length > 0 && entries.length > 0) {
    const lastEntry = entries[entries.length - 1];
    densified[densified.length - 1] = {
      ...lastEntry,
      '@timestamp': densified[densified.length - 1]['@timestamp'],
      calculated_score_norm: lastEntry.calculated_score_norm,
      calculated_level: lastEntry.calculated_level,
    };
  }

  return densified;
};

/** Deterministic ±3 wobble so mocked buckets look lived-in without inventing a new trend. */
const mockScoreWobble = (baseScore: number, seed: number): number => {
  const index = Math.floor(seed);
  const delta = ((index * 17) % 7) - 3; // -3..+3
  return Math.max(0, Math.min(100, Math.round((baseScore + delta) * 100) / 100));
};

const toEpochMs = (timestamp: string): number => new Date(timestamp).getTime();
