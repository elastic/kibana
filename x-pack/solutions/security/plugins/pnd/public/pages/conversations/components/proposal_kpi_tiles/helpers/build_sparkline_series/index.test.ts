/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndActivityBucket } from '@kbn/pnd-common';

import { buildSparklineSeries } from '.';

const buckets: PndActivityBucket[] = [
  { counts: { contain: 1, escalate: 0, investigate: 5, tune: 2 }, time: 1_754_524_800_000 },
  { counts: { contain: 0, escalate: 3, investigate: 0, tune: 0 }, time: 1_754_528_400_000 },
];

describe('buildSparklineSeries', () => {
  it('pulls one action out of the four the bucket carries', () => {
    expect(buildSparklineSeries({ action: 'escalate', buckets })).toEqual([
      { time: 1_754_524_800_000, y: 0 },
      { time: 1_754_528_400_000, y: 3 },
    ]);
  });

  it('keeps the buckets in the order the server sent them, oldest first', () => {
    const times = buildSparklineSeries({ action: 'contain', buckets }).map(({ time }) => time);

    expect(times).toEqual([1_754_524_800_000, 1_754_528_400_000]);
  });

  /**
   * A quiet hour is a real zero, not a gap: the server zero-fills every bucket, and a series with
   * holes in it would draw as an outage.
   */
  it('renders a quiet hour as a zero rather than dropping the point', () => {
    expect(buildSparklineSeries({ action: 'tune', buckets })).toHaveLength(buckets.length);
  });

  it('returns nothing for an empty series', () => {
    expect(buildSparklineSeries({ action: 'investigate', buckets: [] })).toEqual([]);
  });
});
