/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../constants';
import { clampTimeRange } from './clamp_time_range';

const NOW = new Date('2026-10-21T12:00:00.000Z');

const clamp = (from: string, to: string) =>
  clampTimeRange({ from, to }, ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS, NOW);

describe('clampTimeRange', () => {
  it('leaves a range shorter than the maximum unchanged', () => {
    expect(clamp('now-15m', 'now')).toEqual({
      range: { from: 'now-15m', to: 'now' },
      wasClamped: false,
      isValid: true,
    });
  });

  it('leaves a range exactly equal to the maximum unchanged', () => {
    expect(clamp('now-3d', 'now')).toEqual({
      range: { from: 'now-3d', to: 'now' },
      wasClamped: false,
      isValid: true,
    });
  });

  it('clamps a relative range ending at now to a relative maximum range', () => {
    expect(clamp('now-7d', 'now')).toEqual({
      range: { from: 'now-3d', to: 'now' },
      wasClamped: true,
      isValid: true,
    });
  });

  it('clamps an absolute range by moving from to three days before to', () => {
    expect(clamp('2026-10-01T00:00:00.000Z', '2026-10-11T00:00:00.000Z')).toEqual({
      range: { from: '2026-10-08T00:00:00.000Z', to: '2026-10-11T00:00:00.000Z' },
      wasClamped: true,
      isValid: true,
    });
  });

  it('resolves a relative end other than now to an absolute range when clamping', () => {
    expect(clamp('now-1y', 'now-6M')).toEqual({
      range: { from: '2026-04-18T12:00:00.000Z', to: '2026-04-21T12:00:00.000Z' },
      wasClamped: true,
      isValid: true,
    });
  });

  it.each([
    ['This week', 'now/w'],
    ['This month', 'now/M'],
    ['This year', 'now/y'],
  ])('clamps "%s" to the last maximum range instead of a window in the future', (_, unit) => {
    expect(clamp(unit, unit)).toEqual({
      range: { from: 'now-3d', to: 'now' },
      wasClamped: true,
      isValid: true,
    });
  });

  it.each([
    ['This month', 'now/M', new Date(2026, 10, 1, 1)],
    ['This year', 'now/y', new Date(2027, 0, 1, 1)],
    ['This week', 'now/w', new Date(2026, 9, 18, 1)],
  ])(
    'leaves "%s" unchanged right after the period starts instead of reaching into the previous one',
    (_, unit, now) => {
      const result = clampTimeRange({ from: unit, to: unit }, 3, now);

      expect(result).toEqual({
        range: { from: unit, to: unit },
        wasClamped: false,
        isValid: true,
      });
    }
  );

  it.each(['now/w', 'now/M', 'now/y'])(
    'never moves the start of "%s" earlier than the selected start',
    (unit) => {
      const start = new Date('2026-10-01T00:00:00.000Z').getTime();
      const hour = 60 * 60 * 1000;
      for (let offset = 0; offset < 24 * 14; offset += 1) {
        const now = new Date(start + offset * hour);
        const { range, wasClamped } = clampTimeRange({ from: unit, to: unit }, 3, now);
        if (!wasClamped) continue;
        const selectedFrom = dateMath.parse(unit, { forceNow: now })!;
        const clampedFrom = dateMath.parse(range.from, { forceNow: now })!;
        expect(clampedFrom.valueOf()).toBeGreaterThanOrEqual(selectedFrom.valueOf());
      }
    }
  );

  it('leaves a range ending in the future unchanged when its past part is within the maximum', () => {
    expect(clamp('now-1d', 'now+5d')).toEqual({
      range: { from: 'now-1d', to: 'now+5d' },
      wasClamped: false,
      isValid: true,
    });
  });

  it('caps a range ending in the future at now when its past part exceeds the maximum', () => {
    expect(clamp('now-7d', 'now+5d')).toEqual({
      range: { from: 'now-3d', to: 'now' },
      wasClamped: true,
      isValid: true,
    });
  });

  it('marks invalid datemath as invalid and returns the range untouched', () => {
    expect(clamp('now-5x', 'now')).toEqual({
      range: { from: 'now-5x', to: 'now' },
      wasClamped: false,
      isValid: false,
    });
  });

  it('marks a range whose start is after its end as invalid', () => {
    expect(clamp('now', 'now-1h')).toEqual({
      range: { from: 'now', to: 'now-1h' },
      wasClamped: false,
      isValid: false,
    });
  });
});
