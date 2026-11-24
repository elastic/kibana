/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWN_FAILURES_SETTINGS } from './constants';
import type {
  KnownFailureBaseline,
  KnownFailureChange,
  KnownFailureMeasurement,
} from './known_failure_row';

const MINUTE_MS = 60_000;
/** Scales a median absolute deviation to a standard deviation for normally distributed values. */
const MAD_SCALE = 1.4826;
const LEVEL_CHANGE_TYPES = new Set(['step_change', 'trend_change']);

/** A minute judged unusual, with the threshold it was judged against. */
export interface UnusualMinute {
  minute: number;
  count: number;
  threshold: number;
  baseline: KnownFailureBaseline;
}

/** The event a knowledge indicator already has open, as its last unusual minute left it. */
export interface OpenKnownFailure {
  /** The threshold saved when the event opened. */
  threshold: number;
  /** Start of the last unusual minute, in epoch milliseconds. */
  last_minute: number;
}

/**
 * The prototype's baseline check: a minute is unusual above both the median plus `mad_k` scaled
 * median absolute deviations (at least `min_delta` more matches) and a count floor that widens with
 * the indicator's burstiness, its variance over its mean.
 */
export function getBaselineThreshold({ median, mad, mean, std_dev: stdDev }: KnownFailureBaseline) {
  const {
    mad_k: madK,
    min_delta: minDelta,
    count_noise_k: noiseK,
    max_dispersion: maxDispersion,
  } = KNOWN_FAILURES_SETTINGS.baseline;
  const dispersion = mean > 0 ? Math.min(maxDispersion, Math.max(1, stdDev ** 2 / mean)) : 1;
  const countFloor = mean + noiseK * Math.sqrt(dispersion * mean + 1);
  return Math.max(median + Math.max(madK * MAD_SCALE * mad, minDelta), countFloor);
}

/**
 * The unusual minutes of a knowledge indicator's runs, oldest first.
 * 1. Each minute is judged on the newest run that counted it, so a minute whose documents arrived
 *    late is judged again on its full count.
 * 2. With no event open, an unusual minute opens one when it is `spike_factor` times its threshold,
 *    or when another minute within `confirmation.within_minutes` was unusual too. The event saves
 *    that threshold.
 * 3. While the event is open (an unusual minute within the quiet period), a minute is unusual above
 *    the saved threshold, so a long incident never becomes the hour's normal.
 *
 * Minutes in `reported` keep the event's state moving but are left out of the result: an earlier
 * tick already reported them.
 */
export function findUnusualMinutes({
  measurements,
  open,
  reported,
}: {
  /** Newest run first, as the rows are read. */
  measurements: KnownFailureMeasurement[];
  open?: OpenKnownFailure;
  reported: Set<number>;
}): UnusualMinute[] {
  const { quiet_period_minutes: quietMinutes, confirmation } = KNOWN_FAILURES_SETTINGS;

  // 1. Oldest run first, so a newer run overwrites the minutes both counted.
  const byMinute = new Map<number, { count: number; baseline: KnownFailureBaseline }>();
  [...measurements]
    .reverse()
    .forEach(({ minutes, baseline }) =>
      minutes.forEach(({ minute, count }) => byMinute.set(minute, { count, baseline }))
    );
  const minutes = [...byMinute]
    .map(([minute, { count, baseline }]) => ({
      minute,
      count,
      baseline,
      threshold: getBaselineThreshold(baseline),
    }))
    .sort((left, right) => left.minute - right.minute);
  const isAbove = new Map(
    minutes.map(({ minute, count, threshold }) => [minute, count > threshold])
  );
  const hasUnusualNeighbour = (minute: number) =>
    Array.from({ length: confirmation.within_minutes - 1 }, (_, index) => index + 1).some(
      (back) => isAbove.get(minute - back * MINUTE_MS) === true
    );

  // An imperative loop: each minute depends on the event state the minute before it left.
  let event = open;
  const unusual: UnusualMinute[] = [];
  for (const { minute, count, baseline, threshold: own } of minutes) {
    const isOpen = event !== undefined && minute - event.last_minute <= quietMinutes * MINUTE_MS;
    const threshold = isOpen && event ? event.threshold : own;
    // 2. and 3.
    const isUnusual = isOpen
      ? count > threshold
      : count > threshold &&
        (count > confirmation.spike_factor * threshold || hasUnusualNeighbour(minute));
    if (isUnusual) {
      event = { threshold, last_minute: minute };
      if (!reported.has(minute)) {
        unusual.push({ minute, count, threshold, baseline });
      }
    }
  }
  return unusual;
}

/**
 * The rise of a step or trend change that still holds, or `undefined`. The change must be confident
 * and measured from enough minutes, the level after it must clear `max(min_rise, √(before + 1))`,
 * a Poisson-like floor that grows with the level, and the last minutes must still sit at least half
 * that above the level before it, so a rise that faded back reports nothing.
 */
export function getLastingRise(change: KnownFailureChange | undefined): number | undefined {
  const {
    max_pvalue: maxPvalue,
    min_before_minutes: minBefore,
    min_rise: minRise,
  } = KNOWN_FAILURES_SETTINGS.lasting_rise;
  if (
    !change ||
    !LEVEL_CHANGE_TYPES.has(change.type) ||
    change.pvalue > maxPvalue ||
    change.before_minutes < minBefore
  ) {
    return undefined;
  }
  const floor = Math.max(minRise, Math.sqrt(change.before_median + 1));
  const rise = change.after_median - change.before_median;
  return rise >= floor && change.recent_median - change.before_median >= floor / 2
    ? rise
    : undefined;
}
