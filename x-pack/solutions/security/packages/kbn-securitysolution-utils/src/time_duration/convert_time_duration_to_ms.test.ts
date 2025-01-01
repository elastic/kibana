/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTimeDurationToMs } from './convert_time_duration_to_ms';

describe('convertTimeDurationToMs', () => {
  it.each([
    ['5s', 5000],
    ['10m', 600000],
    ['7h', 25200000],
    ['9d', 777600000],
    ['-3s', -3000],
    ['-5m', -300000],
    ['-5h', -18000000],
    ['-7d', -604800000],
  ])('converts "%s" to milliseconds', (duration, expected) => {
    const result = convertTimeDurationToMs(duration);

    expect(result).toBe(expected);
  });

  it.each([['0s'], ['0m'], ['0h'], ['0d'], ['-0s'], ['-0m'], ['-0h'], ['-0d']])(
    'converts "%s" to zero',
    (duration) => {
      const result = convertTimeDurationToMs(duration);

      // Handle negative zero case. Jest treats 0 !== -0.
      expect(`${result}`).toBe('0');
    }
  );

  it('trims leading spaces', () => {
    const result = convertTimeDurationToMs(' 6m');

    expect(result).toBe(360000);
  });

  it('trims trailing spaces', () => {
    const result = convertTimeDurationToMs('8h ');

    expect(result).toBe(28800000);
  });

  it.each([[''], [' '], ['s'], ['invalid'], ['3ss'], ['m4s'], ['78']])(
    'returns "undefined" when tries to convert invalid duration "%s"',
    (invalidDuration) => {
      const result = convertTimeDurationToMs(invalidDuration);

      expect(result).toBeUndefined();
    }
  );

  it.each([['1S'], ['2M'], ['3H'], ['4D'], ['5Y'], ['7nanos'], ['8ms']])(
    'returns "undefined" when tries to convert unsupported duration units "%s"',
    (invalidDuration) => {
      const result = convertTimeDurationToMs(invalidDuration);

      expect(result).toBeUndefined();
    }
  );
});
