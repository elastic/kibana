/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { KNOWN_FAILURES_SETTINGS } from './constants';
import {
  getRunWindow,
  type KnownFailureChange,
  type KnownFailureMeasurement,
} from './known_failure_row';

const MINUTE_MS = 60_000;
const LEVEL_CHANGE_TYPES = new Set(['step_change', 'trend_change']);

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

/** A rise that still holds in one run, on that run's newest minute. */
export interface RiseAtMinute {
  rise: KnownFailureRise;
  /** Start of the run's newest minute, in epoch milliseconds. */
  lastMinute: number;
}

/**
 * The rise of each run that still holds, on the run's newest minute. Every run counts, not only the
 * newest: a tick that reads two runs reports what two ticks reading one each would, so a rise that
 * held in the older run and faded by the newer one is not lost. A minute an earlier tick already
 * reported a rise on is skipped, and two runs ending on the same minute count once, the newer.
 */
export function findRises({
  measurements,
  reported,
  dataFrom,
}: {
  /** Newest run first. */
  measurements: KnownFailureMeasurement[];
  /** Minutes an earlier tick already reported a rise on. */
  reported: Set<number>;
  dataFrom?: number;
}): RiseAtMinute[] {
  return uniqBy(
    measurements.map((measurement) => ({ measurement, ...getRunWindow(measurement) })),
    ({ lastMinute }) => lastMinute
  ).flatMap(({ measurement, lastMinute }) => {
    if (reported.has(lastMinute)) {
      return [];
    }
    const rise = findRise({ measurement, dataFrom });
    return rise ? [{ rise, lastMinute }] : [];
  });
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
