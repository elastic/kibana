/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calcDateMathDiff } from './calc_date_math_diff';

describe('calcDateMathDiff', () => {
  it.each([
    ['now-62s', 'now-1m', 2000],
    ['now-122s', 'now-1m', 62000],
    ['now-660s', 'now-5m', 360000],
    ['now-6600s', 'now-5m', 6300000],
    ['now-7500s', 'now-5m', 7200000],
    ['now-1m', 'now-62s', -2000],
    ['now-1m', 'now-122s', -62000],
    ['now-5m', 'now-660s', -360000],
    ['now-5m', 'now-6600s', -6300000],
    ['now-5m', 'now-7500s', -7200000],
    ['now-1s', 'now-1s', 0],
    ['now-1m', 'now-1m', 0],
    ['now-1h', 'now-1h', 0],
    ['now-1d', 'now-1d', 0],
  ])('calculates milliseconds diff between "%s" and "%s"', (start, end, expected) => {
    const result = calcDateMathDiff(start, end);

    expect(result).toEqual(expected);
  });

  test('returns "undefined" when start is invalid date math', () => {
    const result = calcDateMathDiff('invalid', 'now-5m');

    expect(result).toBeUndefined();
  });

  test('returns "undefined" when end is invalid date math', () => {
    const result = calcDateMathDiff('now-300s', 'invalid');

    expect(result).toBeUndefined();
  });
});
