/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaselinePolicy, BaselineSummary, EngineConfig } from '../../../common';

/** MAD scaled to estimate a standard deviation for normally distributed values. */
const MAD_SCALE = 1.4826;

/**
 * Smallest change that counts as "above normal", per unit. A perfectly flat history has a MAD of
 * zero, and without a floor one extra log line would be "above normal".
 */
const MIN_DELTA_BY_UNIT: Record<string, number> = {
  ratio: 0.03,
  ms: 50,
  count: 3,
  drop: 0.5,
};
const DEFAULT_MIN_DELTA = 1;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function isInsideWindows(
  timestamp: string,
  windows: Array<{ from: string; to?: string }>
): boolean {
  const time = Date.parse(timestamp);
  return windows.some(
    ({ from, to }) => time >= Date.parse(from) && (to === undefined || time < Date.parse(to))
  );
}

/**
 * The baseline check. Compares a detection with its own history, in code, so the answer is the
 * same on every run. Buckets in which an event for this series was open are left out, so a long
 * incident never becomes the new normal.
 */
export function checkBaseline({
  value,
  unit,
  policy,
  history,
  excludeWindows,
  settings,
}: {
  value: number;
  unit: string;
  policy: BaselinePolicy;
  history: Array<{ bucket_start: string; value: number }>;
  excludeWindows: Array<{ from: string; to?: string }>;
  settings: EngineConfig['baseline'];
}): BaselineSummary {
  if (policy === 'skip') {
    return { decision: 'skipped', samples: 0, excludedSamples: 0 };
  }

  const minDelta = MIN_DELTA_BY_UNIT[unit] ?? DEFAULT_MIN_DELTA;

  if (policy === 'implicit_zero') {
    return {
      decision: value >= minDelta ? 'above_normal' : 'background',
      samples: 0,
      excludedSamples: 0,
      median: 0,
      mad: 0,
      threshold: minDelta,
    };
  }

  // Exclude first, then take the most recent samples: an incident longer than the history
  // window would otherwise leave nothing to compare with.
  const outside = history.filter((sample) => !isInsideWindows(sample.bucket_start, excludeWindows));
  const kept = outside.slice(-settings.history_buckets);
  const excludedSamples = history.length - outside.length;

  if (kept.length < settings.min_samples) {
    return { decision: 'warming_up', samples: kept.length, excludedSamples };
  }

  const values = kept.map((sample) => sample.value);
  const center = median(values);
  const mad = median(values.map((sample) => Math.abs(sample - center)));
  const threshold = center + Math.max(settings.mad_k * MAD_SCALE * mad, minDelta);

  return {
    decision: value > threshold ? 'above_normal' : 'background',
    samples: kept.length,
    excludedSamples,
    median: center,
    mad,
    threshold,
  };
}

/**
 * History of a sparse series: one that only has a sample in minutes where it was above zero,
 * such as KI matches on one service. Every minute its heartbeat was evaluated without a sample of
 * its own was a zero. Without this, a series seen for the first time would only ever warm up, and
 * by the time it had ten samples the incident itself would be its normal.
 */
export function fillSparseHistory({
  samples,
  heartbeat,
}: {
  samples: Array<{ bucket_start: string; value: number }>;
  heartbeat: Array<{ bucket_start: string }>;
}): Array<{ bucket_start: string; value: number }> {
  const seen = new Set(samples.map((sample) => Date.parse(sample.bucket_start)));
  const zeros = heartbeat
    .filter((beat) => !seen.has(Date.parse(beat.bucket_start)))
    .map((beat) => ({ bucket_start: beat.bucket_start, value: 0 }));
  return [...samples, ...zeros].sort(
    (a, b) => Date.parse(a.bucket_start) - Date.parse(b.bucket_start)
  );
}
