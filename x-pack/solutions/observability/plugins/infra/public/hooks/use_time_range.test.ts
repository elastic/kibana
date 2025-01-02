/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useTimeRange } from './use_time_range';
import * as datemath from '../utils/datemath';

jest.mock('../utils/datemath');

describe('useTimeRange', () => {
  const mockParseDateRange = datemath.parseDateRange as jest.Mock;

  beforeEach(() => {
    Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1, 12)).valueOf());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default timestamps when rangeFrom and rangeTo are not provided', () => {
    const { result } = renderHook(() => useTimeRange({}));

    const now = Date.now();
    const expectedFrom = new Date(now - 15 * 60000).toISOString();
    const expectedTo = new Date(now).toISOString();

    expect(result.current.from).toBe(expectedFrom);
    expect(result.current.to).toBe(expectedTo);
  });

  it('returns parsed date range when rangeFrom and rangeTo are provided', () => {
    const mockFrom = '2021-01-01T00:00:00.000Z';
    const mockTo = '2021-01-01T01:00:00.000Z';
    mockParseDateRange.mockReturnValue({ from: mockFrom, to: mockTo });

    const { result } = renderHook(() => useTimeRange({ rangeFrom: 'now-15m', rangeTo: 'now' }));

    expect(result.current.from).toBe(mockFrom);
    expect(result.current.to).toBe(mockTo);
  });

  it('returns default timestamps when parseDateRange returns undefined values', () => {
    mockParseDateRange.mockReturnValue({ from: undefined, to: undefined });

    const { result } = renderHook(() => useTimeRange({ rangeFrom: 'now-15m', rangeTo: 'now' }));

    const now = Date.now();
    const expectedFrom = new Date(now - 15 * 60000).toISOString();
    const expectedTo = new Date(now).toISOString();

    expect(result.current.from).toBe(expectedFrom);
    expect(result.current.to).toBe(expectedTo);
  });
});
