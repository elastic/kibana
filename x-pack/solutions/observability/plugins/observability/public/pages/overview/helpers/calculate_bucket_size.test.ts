/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeBuckets } from '@kbn/data-plugin/common';
import { calculateTimeRangeBucketSize } from './calculate_bucket_size';

describe('calculateTimeRangeBucketSize', () => {
  const timeBucketConfig = {
    'histogram:maxBars': 4,
    'histogram:barTarget': 3,
    dateFormat: 'YYYY-MM-DD',
    'dateFormat:scaled': [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ],
  };
  const timeBuckets = new TimeBuckets(timeBucketConfig);

  it.each([
    // 15 minutes
    ['2023-01-09T12:07:54.441Z', '2023-01-09T12:22:54.441Z', 60, '60s', 'HH:mm'],
    ['now-15m', 'now', 60, '60s', 'HH:mm'],
    // 30 minutes
    ['2023-01-09T11:53:43.605Z', '2023-01-09T12:23:43.605Z', 60, '60s', 'HH:mm'],
    // 1 hour
    ['2023-01-09T11:22:05.728Z', '2023-01-09T12:22:05.728Z', 60, '60s', 'HH:mm'],
    // 24 hours
    ['2023-01-08T12:00:00.000Z', '2023-01-09T12:24:30.853Z', 600, '600s', 'HH:mm'],
    // 7 days
    ['2023-01-01T23:00:00.000Z', '2023-01-09T12:29:38.101Z', 3600, '3600s', 'YYYY-MM-DD HH:mm'],
    // 30 days
    ['2022-12-09T23:00:00.000Z', '2023-01-09T12:30:13.717Z', 43200, '43200s', 'YYYY-MM-DD HH:mm'],
    // 90 days
    ['2022-10-10T22:00:00.000Z', '2023-01-09T12:32:11.537Z', 43200, '43200s', 'YYYY-MM-DD HH:mm'],
    // 1 year
    ['2022-01-08T23:00:00.000Z', '2023-01-09T12:33:09.906Z', 86400, '86400s', 'YYYY-MM-DD'],
  ])(
    `Input: [%s, %s], Output: bucketSize: %s, intervalString: %s, dateFormat: %s `,
    (from, to, bucketSize, intervalString, dateFormat) => {
      expect(calculateTimeRangeBucketSize({ from, to }, timeBuckets)).toEqual({
        bucketSize,
        intervalString,
        dateFormat,
      });
    }
  );
});
