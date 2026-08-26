/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareWatchesForDisplay, coverageFromSchedule, isOnDutyNow } from './watch_helpers';
import type { WatchScheduleCoverageInput } from './watch_helpers';

describe('coverageFromSchedule', () => {
  it('returns empty coverage when schedule is unset', () => {
    const schedule: WatchScheduleCoverageInput = {
      set: false,
      mode: 'window',
      from: 9,
      to: 17,
    };
    expect(coverageFromSchedule(schedule)).toEqual([]);
  });

  it('returns full-day coverage for always mode', () => {
    const schedule: WatchScheduleCoverageInput = {
      set: true,
      mode: 'always',
      from: 8,
      to: 18,
    };
    expect(coverageFromSchedule(schedule)).toEqual([[0, 24]]);
  });

  it('splits midnight-wrapping windows', () => {
    const schedule: WatchScheduleCoverageInput = {
      set: true,
      mode: 'window',
      from: 22,
      to: 6,
    };
    expect(coverageFromSchedule(schedule)).toEqual([
      [22, 24],
      [0, 6],
    ]);
  });
});

describe('isOnDutyNow', () => {
  it('detects on-duty within a segment', () => {
    expect(isOnDutyNow([[8, 18]], 10.5)).toBe(true);
    expect(isOnDutyNow([[8, 18]], 20)).toBe(false);
  });

  it('handles wrap segments', () => {
    expect(
      isOnDutyNow(
        [
          [22, 24],
          [0, 6],
        ],
        23
      )
    ).toBe(true);
    expect(
      isOnDutyNow(
        [
          [22, 24],
          [0, 6],
        ],
        3
      )
    ).toBe(true);
    expect(
      isOnDutyNow(
        [
          [22, 24],
          [0, 6],
        ],
        12
      )
    ).toBe(false);
  });
});

describe('compareWatchesForDisplay', () => {
  it('orders by sortOrder then name', () => {
    const watches = [
      { sortOrder: Number.MAX_SAFE_INTEGER, name: 'Custom' },
      { sortOrder: 30, name: 'Dark Watch' },
      { sortOrder: 10, name: 'Watch Floor' },
      { sortOrder: 20, name: 'Watch Officer' },
    ];
    expect(watches.sort(compareWatchesForDisplay).map((w) => w.name)).toEqual([
      'Watch Floor',
      'Watch Officer',
      'Dark Watch',
      'Custom',
    ]);
  });
});
