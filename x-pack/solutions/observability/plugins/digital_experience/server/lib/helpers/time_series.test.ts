/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateHistogram, getBucketSizeSeconds, toTimeSeries } from './time_series';

const HOUR = 60 * 60 * 1000;

describe('getBucketSizeSeconds', () => {
  it('rounds the interval to a readable size', () => {
    expect(getBucketSizeSeconds(0, HOUR)).toBe(60);
    expect(getBucketSizeSeconds(0, 24 * HOUR)).toBe(30 * 60);
  });

  it('never goes below one second', () => {
    expect(getBucketSizeSeconds(0, 1000)).toBe(1);
  });
});

describe('dateHistogram', () => {
  it('returns every bucket of the range, empty ones included', () => {
    expect(dateHistogram(0, HOUR)).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
        min_doc_count: 0,
        extended_bounds: { min: 0, max: HOUR },
      },
    });
  });
});

describe('toTimeSeries', () => {
  it('maps the buckets to points', () => {
    expect(toTimeSeries({ buckets: [{ key: 0, doc_count: 3 }] })).toEqual([
      { timestamp: 0, count: 3 },
    ]);
  });

  it('returns no points without the aggregation', () => {
    expect(toTimeSeries(undefined)).toEqual([]);
  });
});
