/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findUnusualMinutes, getBaselineThreshold, getLastingRise } from './judge_known_failure';
import type { KnownFailureMeasurement } from './known_failure_row';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 10, 20, 10, 0);
/** About 2 matches a minute, wobbling by one. */
const BASELINE = { median: 2, mad: 1, mean: 2, std_dev: 0.8 };
const THRESHOLD = getBaselineThreshold(BASELINE);

/** A run whose newest minutes, from `START` plus `firstMinute`, hold these counts. */
const createRun = (
  firstMinute: number,
  counts: number[],
  baseline = BASELINE
): KnownFailureMeasurement => ({
  rule_id: 'rule-1',
  minutes: counts.map((count, index) => ({
    minute: START + (firstMinute + index) * MINUTE_MS,
    count,
  })),
  baseline,
});

const findMinutes = (measurements: KnownFailureMeasurement[], options = {}) =>
  findUnusualMinutes({ measurements, reported: new Set(), ...options }).map(({ minute, count }) => [
    (minute - START) / MINUTE_MS,
    count,
  ]);

describe('getBaselineThreshold', () => {
  it('keeps at least three matches above a flat hour', () => {
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
    expect(findMinutes([createRun(0, [2, 2, 40, 2, 2, 2, 2])])).toEqual([[2, 40]]);
  });

  it('needs a second unusual minute within three minutes when the first is only just above', () => {
    const justAbove = Math.ceil(THRESHOLD + 1);

    expect(findMinutes([createRun(0, [2, justAbove, 2, 2, 2, 2, 2])])).toEqual([]);
    expect(findMinutes([createRun(0, [2, justAbove, 2, justAbove, 2, 2, 2])])).toEqual([
      [3, justAbove],
    ]);
  });

  // A late minute is judged again on the newer run's full count.
  it('judges a minute two runs counted on the newer run', () => {
    const older = createRun(0, [2, 2, 2, 2, 2, 2, 5]);
    const newer = createRun(5, [2, 60, 2, 2, 2, 2, 2]);

    expect(findMinutes([newer, older])).toEqual([[6, 60]]);
  });

  // Over a long incident the hour before is all incident, so its own threshold would close it.
  it('keeps an open event on the threshold saved when it opened', () => {
    const incidentHour = { median: 25, mad: 1, mean: 25, std_dev: 5 };

    expect(
      findMinutes([createRun(0, [25, 24, 26], incidentHour)], {
        open: { threshold: THRESHOLD, last_minute: START - MINUTE_MS },
      })
    ).toEqual([
      [0, 25],
      [1, 24],
      [2, 26],
    ]);
  });

  it('judges on the minute’s own threshold once the quiet period has passed', () => {
    const open = { threshold: 3 };

    expect(
      findMinutes([createRun(0, [5])], { open: { ...open, last_minute: START - 10 * MINUTE_MS } })
    ).toEqual([[0, 5]]);
    expect(
      findMinutes([createRun(0, [5])], { open: { ...open, last_minute: START - 11 * MINUTE_MS } })
    ).toEqual([]);
  });

  // The last minute is neither far above nor confirmed by a neighbour: only the open event counts it.
  it('leaves out minutes an earlier tick reported while still letting them keep the event open', () => {
    const run = createRun(0, [40, 2, 2, 8]);

    expect(findMinutes([run], { reported: new Set([START]) })).toEqual([[3, 8]]);
  });
});

describe('getLastingRise', () => {
  const STEP = {
    at: START,
    type: 'step_change',
    pvalue: 1e-20,
    before_median: 5,
    before_minutes: 300,
    after_median: 10,
    recent_median: 10,
  };

  it('reports the rise of a step up that still holds', () => {
    expect(getLastingRise(STEP)).toBe(5);
  });

  it.each([
    ['faded back', { recent_median: 6 }],
    ['a step down', { after_median: 2, recent_median: 2 }],
    ['too small for its level', { after_median: 7, recent_median: 7 }],
    ['not confident', { pvalue: 0.2 }],
    ['measured from too few minutes', { before_minutes: 5 }],
    ['a spike, which the minute check judges', { type: 'spike' }],
  ])('reports nothing for a change %s', (_label, override) => {
    expect(getLastingRise({ ...STEP, ...override })).toBeUndefined();
  });
});
