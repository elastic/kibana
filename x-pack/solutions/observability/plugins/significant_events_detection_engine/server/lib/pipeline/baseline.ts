/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertFiringHistory,
  BaselinePolicy,
  BaselineSummary,
  EngineConfig,
} from '../../../common';

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
/**
 * Units whose spread grows with their level, compared on a log scale. On a raw scale a
 * lognormal latency crosses median + 3 MAD in about one minute in ten; on a log scale, in about
 * one in three hundred.
 */
const LOG_UNITS = new Set(['ms']);
/** The most a count floor widens for burstiness, so one huge burst cannot hide everything. */
const MAX_DISPERSION = 25;

/** More episodes than this in an hour and the alert flaps. */
const FLAPPING_EPISODES_PER_HOUR = 3;
/** Active on this many of the last seven days and the alert fires every day. */
const DAILY_ACTIVE_DAYS = 5;

/**
 * Judges a customer alert by how often it fires, not by its value: its rule already decided the
 * value is off. An alert that flaps or fires every day is background, so it never opens an
 * event or holds one open; one that fires rarely is above normal.
 */
export function judgeAlertFiring(firing: AlertFiringHistory): BaselineSummary {
  const base = { samples: 0, excludedSamples: 0, firing };
  if (firing.flapping) {
    return { ...base, decision: 'background', reason: 'Kibana marks the alert as flapping' };
  }
  if (firing.episodes_last_hour >= FLAPPING_EPISODES_PER_HOUR) {
    return {
      ...base,
      decision: 'background',
      reason: `it started ${firing.episodes_last_hour} times in the last hour, so it flaps`,
    };
  }
  if (firing.days_active_last_week >= DAILY_ACTIVE_DAYS) {
    return {
      ...base,
      decision: 'background',
      reason: `it fired on ${firing.days_active_last_week} of the last 7 days`,
    };
  }
  return {
    ...base,
    decision: 'above_normal',
    reason: `it fires rarely: ${firing.episodes_last_hour} start(s) in the last hour, active on ${firing.days_active_last_week} of the last 7 days`,
  };
}

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
 * The baseline check. Compares a signal with its own history, in code, so the answer is the
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
  firing,
}: {
  value: number;
  unit: string;
  policy: BaselinePolicy;
  /** How often a customer alert fired; the `firing_frequency` policy judges only this. */
  firing?: AlertFiringHistory;
  history: Array<{ bucket_start: string; value: number }>;
  excludeWindows: Array<{ from: string; to?: string }>;
  settings: EngineConfig['baseline'];
}): BaselineSummary {
  if (policy === 'firing_frequency' && firing) {
    return judgeAlertFiring(firing);
  }
  if (policy === 'skip') {
    return {
      decision: 'skipped',
      samples: 0,
      excludedSamples: 0,
      reason: 'the strategy compares the value with its own reference',
    };
  }
  if (policy === 'firing_frequency') {
    return { decision: 'skipped', samples: 0, excludedSamples: 0 };
  }
  // A drop is capped at 1, while median + k x MAD of a bursty service's drops is often above
  // it, so this check would block a total outage. The strategy already tested the drop against
  // its expected traffic with a Poisson tail, which is the test counts need.
  if (unit === 'drop') {
    return {
      decision: 'skipped',
      samples: 0,
      excludedSamples: 0,
      reason: 'a drop is judged by the Poisson test on its counts, in the health check',
    };
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

  if (LOG_UNITS.has(unit)) {
    const logs = values.map((sample) => Math.log1p(Math.max(0, sample)));
    const logCenter = median(logs);
    const logMad = median(logs.map((sample) => Math.abs(sample - logCenter)));
    // The unit floor stays on the raw scale: 50 ms is the smallest change worth an event.
    const logThreshold = Math.max(
      Math.expm1(logCenter + settings.mad_k * MAD_SCALE * logMad),
      center + minDelta
    );
    return {
      decision: value > logThreshold ? 'above_normal' : 'background',
      samples: kept.length,
      excludedSamples,
      median: center,
      mad,
      threshold: logThreshold,
      transform: 'log',
      log_median: logCenter,
      log_mad: logMad,
    };
  }

  // A sparse count has a median and MAD of zero while it still matches a few lines most minutes;
  // its spread grows with its mean, as for any count, so the floor follows the mean. Log lines
  // come in bursts, and a Poisson floor on a series whose variance is five times its mean lets
  // through about 27 times the chance triggers, so the floor widens by the series' dispersion.
  const mean = values.reduce((sum, sample) => sum + sample, 0) / values.length;
  const variance =
    values.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / Math.max(1, values.length);
  const dispersion = mean > 0 ? Math.min(MAX_DISPERSION, Math.max(1, variance / mean)) : 1;
  const countFloor =
    unit === 'count' && (settings.count_noise_k ?? 0) > 0
      ? mean + settings.count_noise_k * Math.sqrt(dispersion * mean + 1)
      : 0;
  const threshold = Math.max(
    center + Math.max(settings.mad_k * MAD_SCALE * mad, minDelta),
    countFloor
  );

  return {
    decision: value > threshold ? 'above_normal' : 'background',
    samples: kept.length,
    excludedSamples,
    median: center,
    mad,
    threshold,
    ...(unit === 'count' ? { dispersion } : {}),
  };
}

/**
 * How many scaled MADs a value sits above the median a baseline compared with, on the scale
 * it compared on. Undefined when the history never varied, so no threshold can separate it.
 */
export function zScoreOf(value: number, baseline: BaselineSummary): number | undefined {
  if (baseline.transform === 'log') {
    const { log_median: logMedian, log_mad: logMad } = baseline;
    return logMedian !== undefined && logMad !== undefined && logMad > 0
      ? (Math.log1p(Math.max(0, value)) - logMedian) / (MAD_SCALE * logMad)
      : undefined;
  }
  const { median: center, mad } = baseline;
  return center !== undefined && mad !== undefined && mad > 0
    ? (value - center) / (MAD_SCALE * mad)
    : undefined;
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
  traffic = [],
}: {
  samples: Array<{ bucket_start: string; value: number }>;
  heartbeat: Array<{ bucket_start: string }>;
  /**
   * The service's documents per minute, when the health checks count them. A minute in which the
   * service sent nothing is not a zero: after a collector outage, KIs whose history was all such
   * minutes fired at once when the data came back.
   */
  traffic?: Array<{ bucket_start: string; value: number }>;
}): Array<{ bucket_start: string; value: number }> {
  const seen = new Set(samples.map((sample) => Date.parse(sample.bucket_start)));
  const sent = new Set(
    traffic.filter((sample) => sample.value > 0).map((sample) => Date.parse(sample.bucket_start))
  );
  const zeros = heartbeat
    .filter((beat) => !seen.has(Date.parse(beat.bucket_start)))
    .filter((beat) => traffic.length === 0 || sent.has(Date.parse(beat.bucket_start)))
    .map((beat) => ({ bucket_start: beat.bucket_start, value: 0 }));
  return [...samples, ...zeros].sort(
    (a, b) => Date.parse(a.bucket_start) - Date.parse(b.bucket_start)
  );
}
