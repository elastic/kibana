/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentWindowWidth } from '.';
import { fireEvent, renderHook, act } from '@testing-library/react';

describe('useCurrentWidthWidth', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });
  it('return current window width', () => {
    const { result } = renderHook(() => useCurrentWindowWidth());
    expect(result.current).toBe(window.innerWidth);
  });

  it('return last-throttled value of window.innerWidth with interval of 250ms', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCurrentWindowWidth());

    // first resize within throttle interval
    fireEvent.resize(window, { target: { innerWidth: 500 } });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(1024);

    // second resize within throttle interval
    fireEvent.resize(window, { target: { innerWidth: 400 } });
    act(() => {
      jest.advanceTimersByTime(49);
    });

    expect(result.current).toBe(1024);

    // third and final resize after throttle interval
    fireEvent.resize(window, { target: { innerWidth: 600 } });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe(600);

    // release all timers to confirm the final value
    act(() => {
      jest.runAllTimers();
    });

    expect(result.current).toBe(600);

    jest.useRealTimers();
  });
});
