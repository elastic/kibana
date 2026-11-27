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

/** The knowledge indicator's level went up and is still up. */
export interface KnownFailureRise {
  /**
   * `lasting_rise`: `CHANGE_POINT` found a step or trend up. `slow_rise`: a climb too gradual for
   * `CHANGE_POINT`, seen by comparing the last 15 minutes with the window's oldest 4 hours.
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
 * The rise found in each run, reported on the run's newest minute. Every run is checked, not only
 * the newest, so a tick that reads two runs reports the same as two ticks reading one each. A minute
 * an earlier tick already reported a rise on is skipped; two runs ending on the same minute count
 * once, the newer.
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

/**
 * The smallest rise that counts: at least 3 more matches a minute, and more at higher levels
 * (√(level + 1)), the way random noise grows with the count. At a level of 2 that is 3; at 99, 10.
 */
function getMinRise(levelBefore: number): number {
  return Math.max(KNOWN_FAILURES_SETTINGS.lasting_rise.min_rise, Math.sqrt(levelBefore + 1));
}

/**
 * The rise still holding in one run, or `undefined`. Two checks, the first that finds one wins:
 * - Lasting rise: the latest step or trend change `CHANGE_POINT` found, with a p-value under 0.05
 *   and at least 10 minutes of data before it. The level after it must be at least the smallest
 *   rise above the level before, and the last 15 minutes still half that, so a rise that already
 *   faded reports nothing. Example: 5 a minute, then 10 and still 9 now, is a rise of 5.
 * - Slow rise: the last 15 minutes at least twice the smallest rise above the window's oldest 4
 *   hours, and the hour before them half that, so a climb shows and a short burst does not.
 *
 * Neither looks at minutes from before the source had any data (`dataFrom`): those count as zero
 * matches, so the source's first data would look like a rise.
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
