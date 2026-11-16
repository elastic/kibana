/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HistogramInterval } from '../../common/types/applications';
import { getTimeChartXDomain } from './histogram_interval';

const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;
const SECONDS: HistogramInterval = { value: 1, unit: 's' };
const MONTH: HistogramInterval = { value: 1, unit: 'M' };
const POINTS = [1_000, 2_000].map((timestamp) => {
  return { timestamp };
});

describe('getTimeChartXDomain', () => {
  it('has no domain without buckets or before the response is known', () => {
    const histogram = { interval: SECONDS, start: 1_000, end: 3_000 };

    expect(
      getTimeChartXDomain({ points: [], histogram, timeZone: 'UTC', hasBars: true })
    ).toBeUndefined();
    expect(
      getTimeChartXDomain({ points: POINTS, histogram: undefined, timeZone: 'UTC', hasBars: true })
    ).toBeUndefined();
  });

  it.each([
    // Histogram mode draws the bars past `max` by one interval.
    [true, { min: 1_000, max: 2_000, minInterval: SECOND }],
    // Areas end at the last bucket's start, so the interval is added for its shading.
    [false, { min: 1_000, max: 3_000, minInterval: SECOND }],
  ])('spans the range up to its last bucket when hasBars is %s', (hasBars, xDomain) => {
    const range = { start: 1_500, end: 2_500 };

    expect(
      getTimeChartXDomain({
        points: POINTS,
        histogram: { interval: SECONDS, ...range },
        timeZone: 'UTC',
        hasBars,
      })
    ).toEqual({ ...xDomain, range, hasBars });
  });

  it('reaches the end of a range past the last bucket', () => {
    expect(
      getTimeChartXDomain({
        points: POINTS,
        histogram: { interval: SECONDS, start: 1_000, end: 5_000 },
        timeZone: 'UTC',
        hasBars: true,
      })
    ).toMatchObject({ min: 1_000, max: 4_000, minInterval: SECOND });
  });

  it('measures calendar buckets by the shortest one, February', () => {
    const months = ['2026-01-01', '2026-02-01', '2026-03-01'].map((day) => {
      return { timestamp: Date.parse(`${day}T00:00:00.000Z`) };
    });

    expect(
      getTimeChartXDomain({
        points: months,
        histogram: {
          interval: MONTH,
          start: months[0].timestamp,
          end: Date.parse('2026-04-01T00:00:00.000Z'),
        },
        timeZone: 'UTC',
        hasBars: true,
      })?.minInterval
    ).toBe(28 * DAY);
  });
});
