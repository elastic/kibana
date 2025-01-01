/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toLargestTimeDuration } from './to_largest_time_duration';

describe('toLargestTimeDuration', () => {
  it.each([
    [10, '10ms'],
    [5000, '5s'],
    [600000, '10m'],
    [25200000, '7h'],
    [777600000, '9d'],
    [5184000000, '60d'],
    [-20, '-20ms'],
    [-3000, '-3s'],
    [-300000, '-5m'],
    [-18000000, '-5h'],
    [-604800000, '-7d'],
    [-10368000000, '-120d'],
  ])('converts "%s" to the largest time duration', (duration, expected) => {
    const result = toLargestTimeDuration(duration);

    expect(result).toBe(expected);
  });

  it('converts zero to "0s"', () => {
    const result = toLargestTimeDuration(0);

    expect(result).toBe('0s');
  });

  it('converts NaN to "INVALID"', () => {
    const result = toLargestTimeDuration(NaN);

    expect(result).toBe('INVALID');
  });
});
