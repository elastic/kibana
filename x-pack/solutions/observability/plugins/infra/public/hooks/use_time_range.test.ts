/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTimeRange } from './use_time_range';
import * as datemath from '../utils/datemath';
import * as reloadRequestTimeModule from './use_reload_request_time';

jest.mock('../utils/datemath');
jest.mock('./use_reload_request_time');

describe('useTimeRange', () => {
  const mockParseDateRange = datemath.parseDateRange as jest.Mock;
  const mockUseReloadRequestTimeContext =
    reloadRequestTimeModule.useReloadRequestTimeContext as jest.Mock;

  beforeEach(() => {
    Date.now = jest.fn(() => new Date(Date.UTC(2021, 0, 1, 12)).valueOf());
    mockUseReloadRequestTimeContext.mockReturnValue({
      reloadRequestTime: 0,
      updateReloadRequestTime: jest.fn(),
    });
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

  it('recomputes the resolved date range when reloadRequestTime changes', () => {
    // Simulate wall-clock advancing between the first and second parse.
    const firstFrom = '2021-01-01T11:45:00.000Z';
    const firstTo = '2021-01-01T12:00:00.000Z';
    const secondFrom = '2021-01-01T11:50:00.000Z';
    const secondTo = '2021-01-01T12:05:00.000Z';

    mockParseDateRange
      .mockReturnValueOnce({ from: firstFrom, to: firstTo })
      .mockReturnValueOnce({ from: secondFrom, to: secondTo });

    mockUseReloadRequestTimeContext.mockReturnValue({
      reloadRequestTime: 1_000,
      updateReloadRequestTime: jest.fn(),
    });

    const { result, rerender } = renderHook(() =>
      useTimeRange({ rangeFrom: 'now-15m', rangeTo: 'now' })
    );

    expect(result.current).toEqual({ from: firstFrom, to: firstTo });

    // Simulate refresh: reloadRequestTime advances.
    mockUseReloadRequestTimeContext.mockReturnValue({
      reloadRequestTime: 2_000,
      updateReloadRequestTime: jest.fn(),
    });

    rerender();

    expect(mockParseDateRange).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ from: secondFrom, to: secondTo });
  });
});
