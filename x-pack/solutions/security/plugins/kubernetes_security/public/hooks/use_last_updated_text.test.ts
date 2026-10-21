/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { GlobalFilter } from '../types';
import { useLastUpdatedText } from './use_last_updated_text';

const globalFilter: GlobalFilter = {
  filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
  startDate: '2022-03-08T18:52:15.532Z',
  endDate: '2022-06-09T17:52:15.532Z',
};

describe('useLastUpdatedText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Updated now" on first render', () => {
    const { result } = renderHook(() => useLastUpdatedText(globalFilter));

    expect(result.current).toBe('Updated now');
  });

  it('refreshes the relative time as time passes', () => {
    const { result } = renderHook(() => useLastUpdatedText(globalFilter));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe('Updated 1 minute ago');
  });

  it('resets to "Updated now" when the global filter changes', () => {
    const { result, rerender } = renderHook((filter: GlobalFilter) => useLastUpdatedText(filter), {
      initialProps: globalFilter,
    });

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    rerender({ ...globalFilter, endDate: '2022-06-10T17:52:15.532Z' });

    expect(result.current).toBe('Updated now');
  });
});
