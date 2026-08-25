/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDurationNanoseconds } from '.';

describe('getDurationNanoseconds', () => {
  const defaultStart = new Date('2023-01-01T00:00:00.000Z');
  const defaultEnd = new Date('2023-01-01T00:00:01.000Z');

  it('returns 1_000_000_000 nanoseconds for a 1 second difference', () => {
    const result = getDurationNanoseconds({ start: defaultStart, end: defaultEnd });

    expect(result).toBe(1_000_000_000);
  });

  it('returns 0 nanoseconds for identical start and end', () => {
    const result = getDurationNanoseconds({ start: defaultStart, end: defaultStart });

    expect(result).toBe(0);
  });

  it('returns negative nanoseconds for end before start', () => {
    const result = getDurationNanoseconds({ start: defaultEnd, end: defaultStart });

    expect(result).toBe(-1_000_000_000);
  });

  it('returns correct nanoseconds for a millisecond difference', () => {
    const start = new Date('2023-01-01T00:00:00.123Z');
    const end = new Date('2023-01-01T00:00:00.456Z');
    const result = getDurationNanoseconds({ start, end });

    expect(result).toBe(333_000_000);
  });
});
