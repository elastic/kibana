/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

let mockShouldThrow = false;
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return (...args: unknown[]) => {
    if (mockShouldThrow) {
      throw new Error('forced error');
    }

    return actualMoment(...args);
  };
});

import { getApproximateFutureTime } from '.';

describe('getApproximateFutureTime', () => {
  const baseTime = '2024-01-01T00:00:00.000Z';

  afterEach(() => {
    mockShouldThrow = false;
    jest.resetAllMocks();
  });

  it('returns null if averageSuccessfulDurationNanoseconds is undefined', () => {
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: undefined,
      generationStartTime: baseTime,
    });

    expect(result).toBeNull();
  });

  it('returns a Date offset by the rounded-up seconds', () => {
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: 1_500_000_000, // 1.5s => 2s
      generationStartTime: baseTime,
    });

    expect(result?.toISOString()).toBe('2024-01-01T00:00:02.000Z');
  });

  it('returns a Date offset by 0 seconds if duration is 0', () => {
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: 0,
      generationStartTime: baseTime,
    });

    expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns a Date offset by 1 second if duration is less than 1s', () => {
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: 999_999_999, // just under 1s
      generationStartTime: baseTime,
    });

    expect(result?.toISOString()).toBe('2024-01-01T00:00:01.000Z');
  });

  it('returns an invalid Date if generationStartTime is not a valid date', () => {
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: 1_000_000_000,
      generationStartTime: 'not-a-date',
    });

    expect(result instanceof Date && isNaN(result.getTime())).toBe(true);
  });

  it('returns null when an error is thrown', () => {
    mockShouldThrow = true;
    const result = getApproximateFutureTime({
      averageSuccessfulDurationNanoseconds: 1_000_000_000,
      generationStartTime: baseTime,
    });

    expect(result).toBeNull();
  });
});
