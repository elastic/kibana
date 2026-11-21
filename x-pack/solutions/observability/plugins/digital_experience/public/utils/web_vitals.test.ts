/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatVital } from './web_vitals';

describe('formatVital', () => {
  it('shows CLS unitless, with three decimals', () => {
    expect(formatVital('cls', 0.1)).toBe('0.100');
    expect(formatVital('cls', 0.04567)).toBe('0.046');
  });

  it('shows the other vitals as durations', () => {
    expect(formatVital('lcp', 2412.5)).toBe('2.41 s');
    expect(formatVital('inp', 180)).toBe('180 ms');
    expect(formatVital('ttfb', 950.25)).toBe('950 ms');
  });
});
