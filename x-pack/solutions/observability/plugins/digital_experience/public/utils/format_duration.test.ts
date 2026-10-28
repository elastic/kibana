/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDurationMs } from './format_duration';

describe('formatDurationMs', () => {
  it('shows durations under a second in milliseconds', () => {
    expect(formatDurationMs(0)).toBe('0 ms');
    expect(formatDurationMs(950.25)).toBe('950 ms');
    expect(formatDurationMs(999.6)).toBe('1000 ms');
  });

  it('shows a second and above in seconds, with two decimals', () => {
    expect(formatDurationMs(1000)).toBe('1.00 s');
    expect(formatDurationMs(2412.5)).toBe('2.41 s');
    expect(formatDurationMs(60_000)).toBe('60.00 s');
  });
});
