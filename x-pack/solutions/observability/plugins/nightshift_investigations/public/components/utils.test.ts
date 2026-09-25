/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDate, formatDuration } from './utils';

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO timestamp', () => {
    const result = formatDate('2026-01-15T10:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('Unknown time');
  });

  it('returns "Unknown time" for a non-date string', () => {
    expect(formatDate('not a date')).toBe('Unknown time');
  });

  it('returns "Unknown time" for an empty string', () => {
    expect(formatDate('')).toBe('Unknown time');
  });
});

describe('formatDuration', () => {
  const start = '2026-01-01T10:00:00Z';

  const after = (minutes: number) =>
    new Date(new Date(start).getTime() + minutes * 60_000).toISOString();

  it('shows minutes for runs under an hour', () => {
    expect(formatDuration(start, after(45))).toBe('45 min');
  });

  it('shows "1 min" for a run that rounds to one minute', () => {
    expect(formatDuration(start, after(1))).toBe('1 min');
  });

  it('shows "0 min" for a sub-minute run', () => {
    expect(formatDuration(start, after(0.4))).toBe('0 min');
  });

  it('shows "0 min" when endedAt is before startedAt (clamps negative duration)', () => {
    expect(formatDuration(after(10), start)).toBe('0 min');
  });

  it('shows "59 min" at the boundary below one hour', () => {
    expect(formatDuration(start, after(59))).toBe('59 min');
  });

  it('shows whole hours when there is no minute remainder', () => {
    expect(formatDuration(start, after(60))).toBe('1h');
    expect(formatDuration(start, after(120))).toBe('2h');
  });

  it('shows hours and minutes when there is a remainder', () => {
    expect(formatDuration(start, after(90))).toBe('1h 30m');
    expect(formatDuration(start, after(125))).toBe('2h 5m');
  });
});
