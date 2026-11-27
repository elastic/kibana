/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWN_FAILURES_SETTINGS, MAD_SCALE } from './constants';
import {
  getRunWindow,
  type KnownFailureBaseline,
  type KnownFailureMeasurement,
} from './known_failure_row';

const MINUTE_MS = 60_000;

/** A minute judged unusual, with the threshold it was judged against. */
export interface UnusualMinute {
  minute: number;
  count: number;
  threshold: number;
  baseline: KnownFailureBaseline;
}

/** An event still open from an earlier tick: the threshold it opened with and its last minute. */
export interface OpenKnownFailure {
  /** The threshold saved when the event opened. Later minutes of the event are judged on it. */
  threshold: number;
  /** Start of the last unusual minute, in epoch milliseconds. */
  last_minute: number;
}

/**
 * How many matches a minute needs to be unusual, from the hour before it. Two limits, and a minute
 * must clear both:
 * - the median plus 3 deviations, and at least 3 matches more, so a flat hour does not flag one
 *   extra line;
 * - the mean plus a noise allowance that grows when the indicator is bursty, so its normal bursts
 *   do not count.
 *
 * Example: an hour of about 2 matches a minute gives a threshold of about 7.
 *
 * The rule leaves the hour's spikes out of the mean and spread, so an incident does not raise the
 * threshold for the hour after it.
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
 * The unusual minutes in a knowledge indicator's runs, oldest first.
 *
 * 1. Runs overlap by two minutes, so some minutes were counted twice. The newer count wins: it
 *    includes documents that arrived late. Runs whose normal hour starts before the source had any
 *    data (`dataFrom`) are skipped, since their empty minutes read as zero matches.
 * 2. Without an open event, one minute above the threshold is not enough. It opens an event when it
 *    is twice the threshold, or when a minute in the 2 before it was above the threshold too; then
 *    both are reported. The event saves its threshold.
 * 3. While an event is open (an unusual minute in the last 10), every minute is judged on the saved
 *    threshold, so a long incident never becomes the new normal.
 *
 * Example, threshold 7: minutes of 3, 9, 4 report nothing. Minutes of 3, 9, 8 report both 9 and 8.
 * A minute of 20 reports on its own. After that, a minute of 8 ten minutes later is still judged
 * on 7, even if the hour before it now averages 10.
 *
 * A minute an earlier tick already reported still moves the event along, but is not reported
 * again. A minute before the event's last one, read again from an overlapping run, is judged on
 * the saved threshold but moves nothing.
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
  /** Minutes an earlier tick already reported as unusual. */
  reported: Set<number>;
  /** Start of the minute the source's data begins in, when known. */
  dataFrom?: number;
}): UnusualMinute[] {
  const { quiet_period_minutes: quietMinutes, confirmation } = KNOWN_FAILURES_SETTINGS;

  // 1. Oldest run first, so the newer run's count of a shared minute is the one kept.
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
  for (const { minute, count, baseline, threshold: runThreshold } of minutes) {
    const sinceLast = event ? minute - event.last_minute : -1;
    // A minute before the event's last one: read again from an overlapping run.
    const isBeforeEvent = event !== undefined && sinceLast < 0;
    // Within 10 minutes of the event's last minute, before or after it. Before it too, so a minute
    // read again with late documents is judged as part of the event.
    const isOpen = event !== undefined && Math.abs(sinceLast) <= quietMinutes * MINUTE_MS;
    const threshold = isOpen && event ? event.threshold : runThreshold;
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
