/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildLookback } from '../../entities_grid/queries/esql';
import { TIME_RANGE_DAYS, buildPeriodCondition } from './tile_period';

const RANGES: TimeRange[] = ['24h', '7d', '30d'];

describe('buildPeriodCondition', () => {
  it.each(RANGES)('builds the current period as everything since the lookback for %s', (range) => {
    expect(buildPeriodCondition('@timestamp', range)).toBe(`@timestamp >= ${buildLookback(range)}`);
    expect(buildPeriodCondition('@timestamp', range, 'current')).toBe(
      buildPeriodCondition('@timestamp', range)
    );
  });

  it.each([
    ['24h', 'NOW() - 2 days', 'NOW() - 1 days'],
    ['7d', 'NOW() - 14 days', 'NOW() - 7 days'],
    ['30d', 'NOW() - 60 days', 'NOW() - 30 days'],
  ] as const)('builds the previous period as [2 x range, range) ago for %s', (range, from, to) => {
    expect(buildPeriodCondition('@timestamp', range, 'previous')).toBe(
      `@timestamp >= ${from} AND @timestamp < ${to}`
    );
  });

  it('keeps the day lengths in step with the lookback used by the tile queries', () => {
    RANGES.forEach((range) => {
      expect(buildLookback(range)).toBe(`NOW() - ${TIME_RANGE_DAYS[range]} days`);
    });
  });
});
