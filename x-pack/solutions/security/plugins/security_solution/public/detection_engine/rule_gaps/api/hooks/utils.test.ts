/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGapRange } from './utils';
import { GapRangeValue } from '../../constants';

describe('getGapRange', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return correct range for LAST_24_H', () => {
    const result = getGapRange(GapRangeValue.LAST_24_H);
    expect(result.start).toBe('2024-01-14T10:00:00.000Z');
    expect(result.end).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should return correct range for LAST_3_D', () => {
    const result = getGapRange(GapRangeValue.LAST_3_D);
    expect(result.start).toBe('2024-01-12T10:00:00.000Z');
    expect(result.end).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should return correct range for LAST_7_D', () => {
    const result = getGapRange(GapRangeValue.LAST_7_D);
    expect(result.start).toBe('2024-01-08T10:00:00.000Z');
    expect(result.end).toBe('2024-01-15T10:00:00.000Z');
  });
});
