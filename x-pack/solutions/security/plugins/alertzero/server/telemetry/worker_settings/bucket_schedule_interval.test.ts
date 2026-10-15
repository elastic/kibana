/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCHEDULE_INTERVAL_BUCKETS } from '../constants';
import { bucketScheduleInterval } from './bucket_schedule_interval';

describe('bucketScheduleInterval', () => {
  it.each([
    ['1m', 'lt_15m'],
    ['14m', 'lt_15m'],
    ['15m', '15m_to_lt_1h'],
    ['59m', '15m_to_lt_1h'],
    ['60m', '1h_to_lt_6h'],
    ['1h', '1h_to_lt_6h'],
    ['2h', '1h_to_lt_6h'],
    ['5h', '1h_to_lt_6h'],
    ['6h', '6h_to_lt_24h'],
    ['23h', '6h_to_lt_24h'],
    ['24h', '24h_to_lt_7d'],
    ['1d', '24h_to_lt_7d'],
    ['6d', '24h_to_lt_7d'],
    ['7d', 'gte_7d'],
    ['168h', 'gte_7d'],
    ['30d', 'gte_7d'],
  ])('buckets %s as %s', (interval, bucket) => {
    expect(bucketScheduleInterval(interval)).toBe(bucket);
  });

  it.each([[''], ['0m'], ['15s'], ['1w'], ['h'], ['1.5h'], [' 1h'], ['1h ']])(
    'buckets the malformed interval %p as unknown',
    (interval) => {
      expect(bucketScheduleInterval(interval)).toBe('unknown');
    }
  );

  it('only ever returns a value from the closed bucket vocabulary', () => {
    const intervals = ['1m', '15m', '1h', '6h', '24h', '7d', 'bogus'];

    expect(
      intervals.every((interval) =>
        (SCHEDULE_INTERVAL_BUCKETS as readonly string[]).includes(bucketScheduleInterval(interval))
      )
    ).toBe(true);
  });
});
