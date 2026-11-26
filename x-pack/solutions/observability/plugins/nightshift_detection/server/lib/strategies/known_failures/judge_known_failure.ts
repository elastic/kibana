/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWN_FAILURES_SETTINGS, MAD_SCALE } from './constants';
import type {
  KnownFailureBaseline,
  KnownFailureChange,
  KnownFailureMeasurement,
} from './known_failure_row';

const MINUTE_MS = 60_000;
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

/** A rise of the knowledge indicator's level that still holds. */
export interface KnownFailureRise {
  /**
   * `lasting_rise`: a step or trend change `CHANGE_POINT` found. `slow_rise`: a climb too slow for a
   * change point, seen as the last minutes standing above the window's oldest hours.
   */
  check: 'lasting_rise' | 'slow_rise';
  /** When the higher level began, in epoch milliseconds; for a slow rise, the end of the earlier hours. */
  since: number;
  /** Matches per minute before the rise. */
  level_before: number;
  /** Matches per minute now, the median of the last `recent_minutes`. */
  level_now: number;
  /** How far the level after the change, or now for a slow rise, stands above the level before. */
  rise: number;
  /** The smallest rise that counts at the level before. */
  min_rise: number;
  /** The change point a lasting rise comes from. */
  change?: KnownFailureChange;
}

/** Where the parts of a run's window start, in epoch milliseconds. */
export interface RunWindow {
  start: number;
  baselineStart: number;
  lastMinute: number;
}

/** Where the parts of a run's window start, in epoch milliseconds. */
export function getRunWindow({ minutes }: Pick<KnownFailureMeasurement, 'minutes'>): RunWindow {
  const {
    window_minutes: window,
    newest_minutes: newest,
    baseline_minutes: baseline,
  } = KNOWN_FAILURES_SETTINGS;
  const end = minutes[minutes.length - 1].minute + MINUTE_MS;
  return {
    start: end - window * MINUTE_MS,
    baselineStart: end - (newest + baseline) * MINUTE_MS,
    lastMinute: end - MINUTE_MS,
  };
}

/**
 * The prototype's baseline check: a minute is unusual above both the median plus `mad_k` scaled
 * median absolute deviations (at least `min_delta` more matches) and a count floor that widens with
 * the indicator's burstiness, its variance over its mean. The rule leaves the hour's spikes out of
 * the mean and variance, so one incident cannot raise the floor for the hour after it.
 */
export function getBaselineThreshold(baseline: KnownFailureBaseline): number {
  const { median, mad, mean, std_dev: stdDev } = baseline;
  const {
    mad_k: madK,
    min_delta: minDelta,
    count_noise_k: noiseK,
    max_dispersion: maxDispersion,
  } = KNOWN_FAILURES_SETTINGS.baseline;
  const variance = stdDev ** 2;
  const dispersion = mean > 0 ? Math.min(maxDispersion, Math.max(1, variance / mean)) : 1;
  const countFloor = mean + noiseK * Math.sqrt(dispersion * mean + 1);
  return Math.max(median + Math.max(madK * MAD_SCALE * mad, minDelta), countFloor);
}

/**
 * The unusual minutes of a knowledge indicator's runs, oldest first.
 * 1. Each minute is judged on the newest run that counted it, so a minute whose documents arrived
 *    late is judged again on its full count. A run whose baseline hour starts before `dataFrom` is
 *    left out: the minutes before the source had data count as zero matches, a false normal level.
 * 2. With no event open, an unusual minute opens one when it is `spike_factor` times its threshold,
 *    or when another minute within `confirmation.within_minutes` was above its threshold too; that
 *    minute is reported with it. The event saves the threshold.
 * 3. While the event is open (an unusual minute within the quiet period), a minute is unusual above
 *    the saved threshold, so a long incident never becomes the hour's normal. A minute before the
 *    event's last unusual minute, read again from an overlapping run, is judged on the saved
 *    threshold too, since its documents may have arrived late, but moves nothing.
 *
 * Minutes in `reported` keep the event's state moving but are left out of the result: an earlier
 * tick already reported them.
 */
export function findUnusualMinutes({
  measurements,
  open,
  reported,
  dataFrom,
}: {
  /** Newest run first, as the rows are read. */
  measurements: KnownFailureMeasurement[];
  open?: OpenKnownFailure;
  /** Minutes an earlier tick already reported, by any check. */
  reported: Set<number>;
  /** Start of the minute the source's data begins in, when known. */
  dataFrom?: number;
}): UnusualMinute[] {
  const { quiet_period_minutes: quietMinutes, confirmation } = KNOWN_FAILURES_SETTINGS;

  // 1. Oldest run first, so a newer run overwrites the minutes both counted.
  const byMinute = new Map<
    number,
    { count: number; baseline: KnownFailureBaseline; threshold: number }
  >();
  [...measurements]
    .reverse()
    .filter(
      (measurement) => dataFrom === undefined || getRunWindow(measurement).baselineStart >= dataFrom
    )
    .forEach(({ baseline, minutes: runMinutes }) => {
      const threshold = getBaselineThreshold(baseline);
      runMinutes.forEach(({ minute, count }) =>
        byMinute.set(minute, { count, baseline, threshold })
      );
    });
  const minutes = [...byMinute]
    .map(([minute, judged]) => ({ minute, ...judged }))
    .sort((left, right) => left.minute - right.minute);
  const minuteByStart = new Map(minutes.map((minute) => [minute.minute, minute]));
  const getAboveNeighbours = (minute: number) =>
    Array.from({ length: confirmation.within_minutes - 1 }, (_, index) =>
      minuteByStart.get(minute - (index + 1) * MINUTE_MS)
    ).flatMap((neighbour) =>
      neighbour !== undefined && neighbour.count > neighbour.threshold ? [neighbour] : []
    );

  // An imperative loop: each minute depends on the event state the minute before it left.
  let event = open;
  const unusual = new Map<number, UnusualMinute>();
  for (const { minute, count, baseline, threshold: own } of minutes) {
    const sinceLast = event ? minute - event.last_minute : -1;
    // 3. A minute before the last unusual one was judged before the event reached it.
    const isBeforeEvent = event !== undefined && sinceLast < 0;
    // Within the quiet period on either side of the last unusual minute, so a minute read again
    // with its late documents is judged as part of the event, not against an hour it inflated.
    const isOpen = event !== undefined && Math.abs(sinceLast) <= quietMinutes * MINUTE_MS;
    const threshold = isOpen && event ? event.threshold : own;
    const neighbours = isOpen ? [] : getAboveNeighbours(minute);
    // 2. and 3.
    const isUnusual = isOpen
      ? count > threshold
      : count > threshold &&
        (count > confirmation.spike_factor * threshold || neighbours.length > 0);
    if (!isUnusual) {
      continue;
    }
    if (!isBeforeEvent) {
      event = { threshold, last_minute: minute };
    }
    [...neighbours, { minute, count, baseline, threshold }]
      .filter((found) => !reported.has(found.minute))
      .forEach((found) => unusual.set(found.minute, found));
  }
  return [...unusual.values()].sort((left, right) => left.minute - right.minute);
}

/** `max(min_rise, √(level + 1))`: a Poisson-like floor for a rise, growing with the level. */
function getMinRise(levelBefore: number): number {
  return Math.max(KNOWN_FAILURES_SETTINGS.lasting_rise.min_rise, Math.sqrt(levelBefore + 1));
}

/**
 * The rise of the knowledge indicator's level that still holds in a run, or `undefined`.
 * - A lasting rise: the latest step or trend change, confident (p-value below `max_pvalue`),
 *   measured from at least `min_before_minutes` of data, rising at least `getMinRise` over the level
 *   before, with the last minutes still half that above it, so a rise that faded back reports
 *   nothing.
 * - Otherwise a slow rise: the last minutes `slow_rise.factor` times `getMinRise` above the window's
 *   oldest hours, and the baseline hour half that, so a climb too slow for `CHANGE_POINT` still
 *   shows and a burst in the last minutes does not.
 *
 * Neither counts minutes from before `dataFrom`: before the source had data they count as zero
 * matches, so its first data would look like a rise.
 */
export function findRise({
  measurement,
  dataFrom,
}: {
  measurement: KnownFailureMeasurement;
  dataFrom?: number;
}): KnownFailureRise | undefined {
  return getLastingRise({ measurement, dataFrom }) ?? getSlowRise({ measurement, dataFrom });
}

function getLastingRise({
  measurement: { change, recent_median: levelNow },
  dataFrom,
}: {
  measurement: KnownFailureMeasurement;
  dataFrom?: number;
}): KnownFailureRise | undefined {
  const { max_pvalue: maxPvalue, min_before_minutes: minBefore } =
    KNOWN_FAILURES_SETTINGS.lasting_rise;
  if (
    !change ||
    !LEVEL_CHANGE_TYPES.has(change.type) ||
    change.pvalue >= maxPvalue ||
    change.before_minutes < minBefore ||
    (dataFrom !== undefined && change.at - change.before_minutes * MINUTE_MS < dataFrom)
  ) {
    return undefined;
  }
  const minRise = getMinRise(change.before_median);
  const rise = change.after_median - change.before_median;
  return rise >= minRise && levelNow - change.before_median >= minRise / 2
    ? {
        check: 'lasting_rise',
        since: change.at,
        level_before: change.before_median,
        level_now: levelNow,
        rise,
        min_rise: minRise,
        change,
      }
    : undefined;
}

function getSlowRise({
  measurement,
  dataFrom,
}: {
  measurement: KnownFailureMeasurement;
  dataFrom?: number;
}): KnownFailureRise | undefined {
  const { recent_median: levelNow, earlier_median: levelBefore, baseline } = measurement;
  const { start } = getRunWindow(measurement);
  if (dataFrom !== undefined && start < dataFrom) {
    return undefined;
  }
  const minRise = KNOWN_FAILURES_SETTINGS.slow_rise.factor * getMinRise(levelBefore);
  const rise = levelNow - levelBefore;
  return rise >= minRise && baseline.median - levelBefore >= minRise / 2
    ? {
        check: 'slow_rise',
        since: start + KNOWN_FAILURES_SETTINGS.earlier_minutes * MINUTE_MS,
        level_before: levelBefore,
        level_now: levelNow,
        rise,
        min_rise: minRise,
      }
    : undefined;
}
