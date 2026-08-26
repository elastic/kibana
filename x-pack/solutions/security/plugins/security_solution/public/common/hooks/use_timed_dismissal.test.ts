/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTimedDismissal } from './use_timed_dismissal';

const STORAGE_KEY = 'test.dismissal';

describe('useTimedDismissal', () => {
  let getItemSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns not dismissed when nothing is in localStorage', () => {
    const { result } = renderHook(() => useTimedDismissal(STORAGE_KEY));

    expect(result.current[0]).toBe(false);
    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('returns dismissed when the dismissal has not expired', () => {
    const oneHourMs = 60 * 60 * 1000;
    const fiftyMinutesAgo = Date.now() - 50 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(fiftyMinutesAgo));

    const { result } = renderHook(() => useTimedDismissal(STORAGE_KEY, oneHourMs));

    expect(result.current[0]).toBe(true);
  });

  it('returns not dismissed when the dismissal has expired', () => {
    const oneHourMs = 60 * 60 * 1000;
    const twoHoursAgo = Date.now() - 2 * oneHourMs;
    localStorage.setItem(STORAGE_KEY, String(twoHoursAgo));

    const { result } = renderHook(() => useTimedDismissal(STORAGE_KEY, oneHourMs));

    expect(result.current[0]).toBe(false);
  });
});
