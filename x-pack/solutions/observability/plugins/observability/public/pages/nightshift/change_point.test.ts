/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateChangePointSeries,
  getChangePointIndex,
  getChangePointLabel,
  getChangePointTimestamp,
} from './change_point';

describe('getChangePointLabel', () => {
  it('returns Unknown for missing or invalid types', () => {
    expect(getChangePointLabel()).toBe('Unknown');
    expect(getChangePointLabel('not-a-real-type' as 'spike')).toBe('Unknown');
  });

  it('returns a label for known change-point types', () => {
    expect(getChangePointLabel('spike')).toBe('Spike');
  });
});

describe('getChangePointIndex', () => {
  it('marks spike and dip near the end of the window', () => {
    expect(getChangePointIndex('spike', 20)).toBe(16);
    expect(getChangePointIndex('dip', 20)).toBe(16);
  });

  it('marks trend and step changes near the middle', () => {
    expect(getChangePointIndex('trend_change', 20)).toBe(10);
    expect(getChangePointIndex('step_change', 20)).toBe(10);
  });
});

describe('getChangePointTimestamp', () => {
  it('frames the change knee relative to the detection timestamp', () => {
    const end = new Date('2026-07-10T12:00:00Z').getTime();
    const changeIndex = getChangePointIndex('spike', 28);
    const expected = end - (28 - 1 - changeIndex) * 60_000;

    expect(getChangePointTimestamp('2026-07-10T12:00:00Z', 'spike')).toBe(expected);
  });
});

describe('generateChangePointSeries', () => {
  it('returns a series for extended change-point types', () => {
    expect(generateChangePointSeries('distribution_change', 10)).toHaveLength(10);
    expect(generateChangePointSeries('non_stationary', 10)).toHaveLength(10);
    expect(generateChangePointSeries('stationary', 10)).toHaveLength(10);
    expect(getChangePointIndex('distribution_change', 10)).toBe(9);
    expect(getChangePointIndex('non_stationary', 10)).toBe(9);
    expect(getChangePointIndex('stationary', 10)).toBe(9);
  });
});
