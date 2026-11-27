/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnownFailureMeasurement } from './known_failure_row';
import { findUnusualMinutes, getBaselineThreshold } from './unusual_minutes';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 10, 20, 10, 0);
/** About 2 matches a minute, wobbling by one. */
const BASELINE = { median: 2, mad: 1, mean: 2, std_dev: 0.8 };
const THRESHOLD = getBaselineThreshold(BASELINE);

/** A run whose newest minutes, from `START` plus `firstMinute`, hold these counts. */
const createRun = ({
  firstMinute,
  counts,
  baseline = BASELINE,
}: {
  firstMinute: number;
  counts: number[];
  baseline?: typeof BASELINE;
}): KnownFailureMeasurement => ({
  rule_id: 'rule-1',
  minutes: counts.map((count, index) => ({
    minute: START + (firstMinute + index) * MINUTE_MS,
    count,
  })),
  baseline,
  recent_median: 2,
  earlier_median: 2,
});

const findMinutes = (
  measurements: KnownFailureMeasurement[],
  options: Partial<Parameters<typeof findUnusualMinutes>[0]> = {}
) =>
  findUnusualMinutes({ measurements, reported: new Set(), ...options }).map(({ minute, count }) => [
    (minute - START) / MINUTE_MS,
    count,
  ]);

describe('getBaselineThreshold', () => {
  // A zero mean must not turn the burstiness ratio into NaN.
  it('keeps a finite threshold, three matches up, over an hour with no matches', () => {
    expect(getBaselineThreshold({ median: 0, mad: 0, mean: 0, std_dev: 0 })).toBe(3);
  });

  // A bursty indicator's spread grows with its mean; a Poisson floor would flag its bursts.
  it('raises the threshold of a bursty indicator above that of a steady one at the same level', () => {
    const steady = { median: 5, mad: 1, mean: 5, std_dev: Math.sqrt(5) };

    expect(getBaselineThreshold({ ...steady, std_dev: Math.sqrt(30) })).toBeGreaterThan(
      getBaselineThreshold(steady)
    );
  });
});

describe('findUnusualMinutes', () => {
  it('opens an event on a single minute far above the threshold', () => {
    expect(findMinutes([createRun({ firstMinute: 0, counts: [2, 2, 40, 2, 2, 2, 2] })])).toEqual([
      [2, 40],
    ]);
  });

  // The first minute of the pair is where the failure starts, so it is reported too.
  it('needs a second minute above the threshold within three minutes when the first is only just above', () => {
    const justAbove = Math.ceil(THRESHOLD + 1);
    const find = (counts: number[]) => findMinutes([createRun({ firstMinute: 0, counts })]);

    expect(find([2, justAbove, 2, 2, 2, 2, 2])).toEqual([]);
    expect(find([2, justAbove, 2, justAbove, 2, 2, 2])).toEqual([
      [1, justAbove],
      [3, justAbove],
    ]);
    expect(find([2, justAbove, 2, 2, justAbove, 2, 2])).toEqual([]);
  });

  // A late minute is judged again on the newer run's full count.
  it('judges a minute two runs counted on the newer run', () => {
    const older = createRun({ firstMinute: 0, counts: [2, 2, 2, 2, 2, 2, 5] });
    const newer = createRun({ firstMinute: 5, counts: [2, 60, 2, 2, 2, 2, 2] });

    expect(findMinutes([newer, older])).toEqual([[6, 60]]);
  });

  // Over a long incident the hour before is all incident, so its own threshold would close it.
  it('keeps an open event on the threshold saved when it opened', () => {
    const incidentHour = { median: 25, mad: 1, mean: 25, std_dev: 5 };

    expect(
      findMinutes([createRun({ firstMinute: 0, counts: [25, 24, 26], baseline: incidentHour })], {
        open: { threshold: THRESHOLD, last_minute: START - MINUTE_MS },
      })
    ).toEqual([
      [0, 25],
      [1, 24],
      [2, 26],
    ]);
  });

  // On the replay an overlap minute, judged again on its own higher threshold, replaced the saved
  // one, and the event's threshold crept from 9 to 18 within its first hour.
  it('keeps the saved threshold when an overlap minute before the last unusual one is judged again', () => {
    const incidentHour = { median: 10, mad: 1, mean: 10, std_dev: 3 };

    expect(
      findMinutes(
        [createRun({ firstMinute: 0, counts: [40, 2, 25, 12], baseline: incidentHour })],
        {
          open: { threshold: THRESHOLD, last_minute: START + 2 * MINUTE_MS },
          reported: new Set([START, START + 2 * MINUTE_MS]),
        }
      )
    ).toEqual([[3, 12]]);
  });

  // Its documents arrived late, so the newer run counts it in full; the hour behind it is all
  // incident, and its own threshold would let it pass.
  it('judges a late minute before the last unusual one on the saved threshold', () => {
    const incidentHour = { median: 25, mad: 1, mean: 25, std_dev: 5 };

    expect(
      findMinutes([createRun({ firstMinute: 0, counts: [25, 2, 30], baseline: incidentHour })], {
        open: { threshold: THRESHOLD, last_minute: START + 2 * MINUTE_MS },
        reported: new Set([START + 2 * MINUTE_MS]),
      })
    ).toEqual([[0, 25]]);
  });

  it('judges on the minute’s own threshold once the quiet period has passed', () => {
    const find = (minutesSinceLast: number) =>
      findMinutes([createRun({ firstMinute: 0, counts: [5] })], {
        open: { threshold: 3, last_minute: START - minutesSinceLast * MINUTE_MS },
      });

    expect(find(10)).toEqual([[0, 5]]);
    expect(find(11)).toEqual([]);
  });

  // The last minute is neither far above nor confirmed by a neighbour: only the open event counts it.
  it('leaves out minutes an earlier tick reported while still letting them keep the event open', () => {
    const run = createRun({ firstMinute: 0, counts: [40, 2, 2, 8] });

    expect(findMinutes([run], { reported: new Set([START]) })).toEqual([[3, 8]]);
  });

  // Before the source had data its minutes count as zero matches, a false normal level.
  it('judges no run whose normal level reaches back before the source’s data', () => {
    const run = createRun({ firstMinute: 0, counts: [2, 2, 40, 2, 2, 2, 2] });
    const baselineStart = START - 60 * MINUTE_MS;

    expect(findMinutes([run], { dataFrom: baselineStart })).toEqual([[2, 40]]);
    expect(findMinutes([run], { dataFrom: baselineStart + MINUTE_MS })).toEqual([]);
  });
});
