/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTimeDuration } from './parse_time_duration';

describe('parseTimeDuration', () => {
  it.each([
    ['5s', 5, 's'],
    ['10m', 10, 'm'],
    ['7h', 7, 'h'],
    ['9d', 9, 'd'],
    ['+5s', 5, 's'],
    ['+10m', 10, 'm'],
    ['+7h', 7, 'h'],
    ['+9d', 9, 'd'],
    ['-3s', -3, 's'],
    ['-5m', -5, 'm'],
    ['-5h', -5, 'h'],
    ['-7d', -7, 'd'],
    ['0s', 0, 's'],
    ['0m', 0, 'm'],
    ['0h', 0, 'h'],
    ['0d', 0, 'd'],
    ['+0s', 0, 's'],
    ['+0m', 0, 'm'],
    ['+0h', 0, 'h'],
    ['+0d', 0, 'd'],
    // Jest treats 0 !== -0.
    ['-0s', -0, 's'],
    ['-0m', -0, 'm'],
    ['-0h', -0, 'h'],
    ['-0d', -0, 'd'],
  ])('parses "%s"', (duration, expectedValue, expectedUnit) => {
    const result = parseTimeDuration(duration);

    expect(result).toEqual({ value: expectedValue, unit: expectedUnit });
  });

  it('does NOT trim leading spaces', () => {
    const result = parseTimeDuration(' 6m');

    expect(result).toBeUndefined();
  });

  it('does NOT trim trailing spaces', () => {
    const result = parseTimeDuration('8h ');

    expect(result).toBeUndefined();
  });

  it.each([[''], [' '], ['s'], ['invalid'], ['3ss'], ['m4s'], ['78']])(
    'returns "undefined" when tries to parse invalid duration "%s"',
    (invalidDuration) => {
      const result = parseTimeDuration(invalidDuration);

      expect(result).toBeUndefined();
    }
  );

  it.each([['1S'], ['2M'], ['3H'], ['4D'], ['5Y'], ['7nanos'], ['8ms']])(
    'returns "undefined" when tries to parse unsupported duration units "%s"',
    (invalidDuration) => {
      const result = parseTimeDuration(invalidDuration);

      expect(result).toBeUndefined();
    }
  );
});
