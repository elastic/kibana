/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSessionDuration } from './format_session_duration';

describe('formatSessionDuration', () => {
  it.each([
    [0, '0 ms'],
    [850.4, '850 ms'],
    [999, '999 ms'],
    [1000, '1 s'],
    [42_400, '42 s'],
    [59_600, '1 min 0 s'],
    [200_000, '3 min 20 s'],
    [3_600_000, '1 h 0 min'],
    [3_930_000, '1 h 5 min'],
  ])('formats %d ms as %s', (milliseconds, expected) => {
    expect(formatSessionDuration(milliseconds)).toBe(expected);
  });
});
