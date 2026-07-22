/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDurationNanoseconds } from './get_duration_nanoseconds';

describe('getDurationNanoseconds', () => {
  it('returns correct duration in nanoseconds for 1.5 seconds', () => {
    const start = new Date('2026-01-12T10:00:00.000Z');
    const end = new Date('2026-01-12T10:00:01.500Z');

    const result = getDurationNanoseconds({ start, end });

    expect(result).toBe(1_500_000_000);
  });

  it('returns correct duration in nanoseconds for 0 seconds', () => {
    const start = new Date('2026-01-12T10:00:00.000Z');
    const end = new Date('2026-01-12T10:00:00.000Z');

    const result = getDurationNanoseconds({ start, end });

    expect(result).toBe(0);
  });

  it('returns correct duration in nanoseconds for 1 millisecond', () => {
    const start = new Date('2026-01-12T10:00:00.000Z');
    const end = new Date('2026-01-12T10:00:00.001Z');

    const result = getDurationNanoseconds({ start, end });

    expect(result).toBe(1_000_000);
  });

  it('returns correct duration in nanoseconds for 1 minute', () => {
    const start = new Date('2026-01-12T10:00:00.000Z');
    const end = new Date('2026-01-12T10:01:00.000Z');

    const result = getDurationNanoseconds({ start, end });

    expect(result).toBe(60_000_000_000);
  });
});
