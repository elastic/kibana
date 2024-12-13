/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIntervalInSeconds } from './get_interval_in_seconds';

describe('getIntervalInSeconds', () => {
  const testData = [
    { interval: '5ms', result: 0.005 },
    { interval: '70s', result: 70 },
    { interval: '25m', result: 1500 },
    { interval: '10h', result: 36000 },
    { interval: '3d', result: 259200 },
    { interval: '1w', result: 604800 },
    { interval: '1y', result: 30758400 },
  ];

  it.each(testData)('getIntervalInSeconds($interval) = $result', ({ interval, result }) => {
    expect(getIntervalInSeconds(interval)).toBe(result);
  });

  it('Throws error if interval is not valid', () => {
    expect(() => getIntervalInSeconds('invalid')).toThrow('Invalid interval string format.');
  });
});
