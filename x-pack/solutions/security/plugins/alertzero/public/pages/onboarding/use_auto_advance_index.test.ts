/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useAutoAdvanceIndex } from './use_auto_advance_index';

const mockReducedMotion = (matches: boolean) => {
  window.matchMedia = jest.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

describe('useAutoAdvanceIndex', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('advances on the interval and wraps around', () => {
    const { result } = renderHook(() => useAutoAdvanceIndex(3, 1000));

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('pauses on mouse enter / focus and resumes on leave / blur', () => {
    const { result } = renderHook(() => useAutoAdvanceIndex(3, 1000));

    act(() => result.current.pauseProps.onMouseEnter());
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.pauseProps.onMouseLeave());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => result.current.pauseProps.onFocus());
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => result.current.pauseProps.onBlur());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it('stops rotating for good once an index is selected', () => {
    const { result } = renderHook(() => useAutoAdvanceIndex(3, 1000));

    act(() => result.current.select(2));
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.activeIndex).toBe(2);
  });

  it('never starts when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useAutoAdvanceIndex(3, 1000));

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(result.current.activeIndex).toBe(0);
  });
});
