/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnownFailureMeasurement } from './known_failure_row';
import { findRise } from './rises';

const MINUTE_MS = 60_000;
const START = Date.UTC(2026, 10, 20, 10, 0);
/** About 2 matches a minute, wobbling by one. */
const BASELINE = { median: 2, mad: 1, mean: 2, std_dev: 0.8 };

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

describe('findRise', () => {
  const STEP = {
    at: START,
    type: 'step_change',
    pvalue: 1e-20,
    before_median: 5,
    before_minutes: 300,
    after_median: 10,
  };
  const createMeasurement = (
    override: Partial<KnownFailureMeasurement> = {}
  ): KnownFailureMeasurement => ({
    ...createRun({ firstMinute: 60, counts: [10, 10, 10, 10, 10, 10, 10] }),
    change: STEP,
    recent_median: 10,
    earlier_median: 5,
    ...override,
  });

  it('reports the rise of a step up that still holds', () => {
    expect(findRise({ measurement: createMeasurement() })).toEqual(
      expect.objectContaining({ check: 'lasting_rise', since: START, rise: 5, min_rise: 3 })
    );
  });

  it.each([
    ['faded back', {}, { recent_median: 6 }],
    ['a step down', { after_median: 2 }, { recent_median: 2 }],
    ['too small for its level', { after_median: 7 }, { recent_median: 7 }],
    ['not confident', { pvalue: 0.05 }, {}],
    ['measured from too few minutes', { before_minutes: 5 }, {}],
    ['a spike, which the minute check judges', { type: 'spike' }, {}],
  ])('reports no lasting rise for a change %s', (_label, change, measurement) => {
    expect(
      findRise({
        measurement: createMeasurement({ change: { ...STEP, ...change }, ...measurement }),
      })
    ).not.toEqual(expect.objectContaining({ check: 'lasting_rise' }));
  });

  // The minutes before the source's data count as zeros, so its first data looks like a step up.
  it('reports no rise measured from minutes before the source’s data', () => {
    const changeSegmentStart = START - 300 * MINUTE_MS;

    expect(findRise({ measurement: createMeasurement(), dataFrom: changeSegmentStart })).toEqual(
      expect.objectContaining({ check: 'lasting_rise' })
    );
    expect(
      findRise({ measurement: createMeasurement(), dataFrom: changeSegmentStart + MINUTE_MS })
    ).toBeUndefined();
  });

  // CHANGE_POINT gives a climb over hours no step or trend.
  it('reports a slow rise when the last minutes and the hour stand well above the oldest hours', () => {
    const climbing = createMeasurement({
      change: undefined,
      earlier_median: 4,
      recent_median: 14,
      baseline: { ...BASELINE, median: 12 },
    });

    expect(findRise({ measurement: climbing })).toEqual(
      expect.objectContaining({ check: 'slow_rise', level_before: 4, level_now: 14 })
    );
    // A burst in the last minutes alone is the minute check's to judge.
    expect(findRise({ measurement: { ...climbing, baseline: BASELINE } })).toBeUndefined();
  });

  // A new source's oldest hours are zero-filled, so its earlier level reads 0.
  it('reports no slow rise when the window reaches back before the source’s data', () => {
    const climbing = createMeasurement({
      change: undefined,
      earlier_median: 4,
      recent_median: 14,
      baseline: { ...BASELINE, median: 12 },
    });
    const windowStart = START + 67 * MINUTE_MS - 360 * MINUTE_MS;

    expect(findRise({ measurement: climbing, dataFrom: windowStart })).toEqual(
      expect.objectContaining({ check: 'slow_rise' })
    );
    expect(findRise({ measurement: climbing, dataFrom: windowStart + MINUTE_MS })).toBeUndefined();
  });
});
