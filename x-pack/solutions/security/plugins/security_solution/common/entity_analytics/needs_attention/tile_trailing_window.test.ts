/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRAILING_WINDOW,
  trailingBucketGrouping,
  trailingFetchHours,
} from './tile_trailing_window';

describe('TRAILING_WINDOW', () => {
  it('uses hourly dots for 24h, 6-hourly for 7d and daily for 30d', () => {
    expect(TRAILING_WINDOW).toEqual({
      '24h': { stepHours: 1, dots: 24 },
      '7d': { stepHours: 6, dots: 28 },
      '30d': { stepHours: 24, dots: 30 },
    });
  });

  it.each(['24h', '7d', '30d'] as const)('has dots that cover the whole range for %s', (range) => {
    const rangeHours = { '24h': 24, '7d': 168, '30d': 720 }[range];
    const { stepHours, dots } = TRAILING_WINDOW[range];
    expect(stepHours * dots).toBe(rangeHours);
  });
});

describe('trailingBucketGrouping', () => {
  it.each([
    ['24h', 'bucket = DATE_DIFF("hour", @timestamp, NOW()) / 1'],
    ['7d', 'bucket = DATE_DIFF("hour", @timestamp, NOW()) / 6'],
    ['30d', 'bucket = DATE_DIFF("hour", @timestamp, NOW()) / 24'],
  ] as const)('numbers buckets back from NOW() for %s', (range, expected) => {
    expect(trailingBucketGrouping(range)).toBe(expected);
  });
});

describe('trailingFetchHours', () => {
  it.each([
    ['24h', 47],
    ['7d', 330],
    ['30d', 1416],
  ] as const)('reads far enough back for the oldest dot of %s (%i h)', (range, hours) => {
    expect(trailingFetchHours(range)).toBe(hours);
  });
});
