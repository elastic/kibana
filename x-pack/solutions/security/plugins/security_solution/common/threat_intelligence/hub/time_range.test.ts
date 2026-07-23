/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_TIME_RANGE_PRESET,
  isTimeRangePresetId,
  percentChangeVsPrior,
  resolvePriorTimeRange,
  resolveTimeRangeFromPreset,
} from './time_range';

describe('time_range', () => {
  const now = Date.parse('2026-05-17T12:00:00.000Z');

  it('defaults to 7d', () => {
    expect(DEFAULT_TIME_RANGE_PRESET).toBe('7d');
  });

  it('resolves preset windows relative to now', () => {
    const { from, to } = resolveTimeRangeFromPreset('24h', now);
    expect(to).toBe('2026-05-17T12:00:00.000Z');
    expect(from).toBe('2026-05-16T12:00:00.000Z');
  });

  it('resolves 90d', () => {
    const { from } = resolveTimeRangeFromPreset('90d', now);
    expect(from).toBe('2026-02-16T12:00:00.000Z');
  });

  it('validates preset ids', () => {
    expect(isTimeRangePresetId('7d')).toBe(true);
    expect(isTimeRangePresetId('custom')).toBe(false);
  });

  it('resolves a prior window of equal length ending at current from', () => {
    const current = resolveTimeRangeFromPreset('7d', now);
    const prior = resolvePriorTimeRange(current.from, current.to);
    const currentDuration = Date.parse(current.to) - Date.parse(current.from);
    const priorDuration = Date.parse(prior.to) - Date.parse(prior.from);
    expect(prior.to).toBe(current.from);
    expect(priorDuration).toBe(currentDuration);
    expect(prior.from).toBe('2026-05-03T12:00:00.000Z');
  });

  it('rejects invalid ranges for prior resolution', () => {
    expect(() =>
      resolvePriorTimeRange('2026-05-17T12:00:00.000Z', '2026-05-17T12:00:00.000Z')
    ).toThrow(/invalid range/);
  });
});

describe('percentChangeVsPrior', () => {
  it('returns 0 when both periods are empty', () => {
    expect(percentChangeVsPrior(0, 0)).toBe(0);
  });

  it('returns 100 when current has activity and prior is empty', () => {
    expect(percentChangeVsPrior(4, 0)).toBe(100);
  });

  it('rounds percent change against a non-zero prior', () => {
    expect(percentChangeVsPrior(8, 7)).toBe(14);
    expect(percentChangeVsPrior(7, 7)).toBe(0);
    expect(percentChangeVsPrior(5, 10)).toBe(-50);
  });
});
