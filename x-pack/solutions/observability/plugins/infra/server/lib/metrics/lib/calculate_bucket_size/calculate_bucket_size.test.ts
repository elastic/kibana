/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateBucketSize } from '.';
import moment from 'moment';

const timerange = {
  from: moment('2017-01-01T00:00:00.000Z').valueOf(),
  to: moment('2017-01-01T01:00:00.000Z').valueOf(),
  interval: '1m',
  field: '@timetsamp',
};

describe('calculateBucketSize(timerange, intervalString)', () => {
  test('returns auto calculated buckets', () => {
    const result = calculateBucketSize({ ...timerange, interval: 'auto' });
    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });

  test('returns overridden buckets (1s)', () => {
    const result = calculateBucketSize({ ...timerange, interval: '1s' });
    expect(result).toHaveProperty('bucketSize', 1);
    expect(result).toHaveProperty('intervalString', '1s');
  });

  test('returns overridden buckets (10m)', () => {
    const result = calculateBucketSize({ ...timerange, interval: '10m' });
    expect(result).toHaveProperty('bucketSize', 600);
    expect(result).toHaveProperty('intervalString', '10m');
  });

  test('returns overridden buckets (1d)', () => {
    const result = calculateBucketSize({ ...timerange, interval: '1d' });
    expect(result).toHaveProperty('bucketSize', 86400);
    expect(result).toHaveProperty('intervalString', '1d');
  });

  test('returns overridden buckets (>=2d)', () => {
    const result = calculateBucketSize({ ...timerange, interval: '>=2d' });
    expect(result).toHaveProperty('bucketSize', 86400 * 2);
    expect(result).toHaveProperty('intervalString', '2d');
  });

  test('returns overridden buckets (>=10s)', () => {
    const result = calculateBucketSize({ ...timerange, interval: '>=10s' });
    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });
});
