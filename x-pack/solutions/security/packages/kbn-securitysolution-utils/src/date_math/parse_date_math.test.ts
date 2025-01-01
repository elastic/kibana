/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDateMath } from './parse_date_math';

describe('parseDateMath', () => {
  it.each([
    ['now', { pit: 'now', offsetValue: 0, offsetUnit: 's' }],
    ['now+0s', { pit: 'now', offsetValue: 0, offsetUnit: 's' }],
    ['now-0s', { pit: 'now', offsetValue: -0, offsetUnit: 's' }],
    ['now-3s', { pit: 'now', offsetValue: -3, offsetUnit: 's' }],
    ['now-5m', { pit: 'now', offsetValue: -5, offsetUnit: 'm' }],
    ['now-7h', { pit: 'now', offsetValue: -7, offsetUnit: 'h' }],
    ['now-3d', { pit: 'now', offsetValue: -3, offsetUnit: 'd' }],
    ['now-123s', { pit: 'now', offsetValue: -123, offsetUnit: 's' }],
    ['now-3345m', { pit: 'now', offsetValue: -3345, offsetUnit: 'm' }],
    ['now-1234567h', { pit: 'now', offsetValue: -1234567, offsetUnit: 'h' }],
    ['now-45677899d', { pit: 'now', offsetValue: -45677899, offsetUnit: 'd' }],
    ['now+2s', { pit: 'now', offsetValue: 2, offsetUnit: 's' }],
    ['now+5m', { pit: 'now', offsetValue: 5, offsetUnit: 'm' }],
    ['now+1h', { pit: 'now', offsetValue: 1, offsetUnit: 'h' }],
    ['now+5d', { pit: 'now', offsetValue: 5, offsetUnit: 'd' }],
    ['now+12s', { pit: 'now', offsetValue: 12, offsetUnit: 's' }],
    ['now+235m', { pit: 'now', offsetValue: 235, offsetUnit: 'm' }],
    ['now+456h', { pit: 'now', offsetValue: 456, offsetUnit: 'h' }],
    ['now+45677899d', { pit: 'now', offsetValue: 45677899, offsetUnit: 'd' }],
  ])('parses "%s"', (input, expected) => {
    const result = parseDateMath(input);

    expect(result).toEqual(expected);
  });

  it.each([
    ['now-3.5d'],
    [''],
    [' '],
    [' now-3m'],
    ['now-7h '],
    [' now '],
    ['invalid'],
    ['now3s'],
    ['now+invalid'],
    ['now-invalid'],
  ])('returns "undefined" for "%s"', (input) => {
    const result = parseDateMath(input);

    expect(result).toBeUndefined();
  });
});
