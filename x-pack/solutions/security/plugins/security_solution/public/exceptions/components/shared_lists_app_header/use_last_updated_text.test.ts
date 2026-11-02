/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useLastUpdatedText } from './use_last_updated_text';

describe('useLastUpdatedText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-14T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the updating text while loading', () => {
    const { result } = renderHook(() =>
      useLastUpdatedText({ isLoading: true, updatedAt: Date.now() })
    );

    expect(result.current).toBe('Updating...');
  });

  it('returns the relative time since the last update', () => {
    const { result } = renderHook(() =>
      useLastUpdatedText({ isLoading: false, updatedAt: Date.now() })
    );

    expect(result.current).toBe('Updated now');
  });

  it('refreshes the relative time as time passes', () => {
    const updatedAt = Date.now();
    const { result } = renderHook(() => useLastUpdatedText({ isLoading: false, updatedAt }));

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe('Updated 1 minute ago');
  });

  it('does not show a future time when the lists refresh between two ticks', () => {
    const { result, rerender } = renderHook(
      ({ updatedAt }) => useLastUpdatedText({ isLoading: false, updatedAt }),
      { initialProps: { updatedAt: Date.now() } }
    );

    // Less than the refresh interval, so the hook's own timer has not fired yet.
    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    rerender({ updatedAt: Date.now() });

    expect(result.current).toBe('Updated now');
  });
});
