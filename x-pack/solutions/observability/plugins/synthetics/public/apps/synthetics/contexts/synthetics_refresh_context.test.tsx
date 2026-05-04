/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  SyntheticsRefreshContextProvider,
  useSyntheticsRefreshContext,
} from './synthetics_refresh_context';

describe('SyntheticsRefreshContextProvider', () => {
  const wrapper = ({ children }: React.PropsWithChildren) =>
    React.createElement(SyntheticsRefreshContextProvider, null, children);

  beforeEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  it('initializes `lastRefresh` to a non-zero timestamp on mount', () => {
    const before = Date.now();
    const { result } = renderHook(() => useSyntheticsRefreshContext(), { wrapper });
    const after = Date.now();

    expect(result.current.lastRefresh).toBeGreaterThanOrEqual(before);
    expect(result.current.lastRefresh).toBeLessThanOrEqual(after);
  });

  it('does not double-bump `lastRefresh` on initial mount', () => {
    // The provider initialises `lastRefresh = Date.now()` in `useState`, and an
    // effect watching `refreshPaused` then calls `refreshApp()`. Without the
    // initial-mount guard introduced in this PR, that effect's first run would
    // mutate `lastRefresh` a second time during the mount sequence, fanning out
    // a duplicate fetch to every consumer hook that depends on it. This test
    // pins the guard: a re-render without any state change must observe the
    // exact same `lastRefresh` value (i.e. `setLastRefresh` was not called a
    // second time during commit, which would have produced a fresh `Date.now()`).

    const renders: number[] = [];
    const { rerender } = renderHook(
      () => {
        const ctx = useSyntheticsRefreshContext();
        renders.push(ctx.lastRefresh);
        return ctx;
      },
      { wrapper }
    );

    rerender();

    expect(new Set(renders).size).toBe(1);
  });

  it('bumps `lastRefresh` when the auto-refresh switch is un-paused', () => {
    const { result } = renderHook(() => useSyntheticsRefreshContext(), { wrapper });

    expect(result.current.refreshPaused).toBe(true);
    const initialLastRefresh = result.current.lastRefresh;

    // Wait at least 1ms so the new `Date.now()` in `refreshApp` differs from
    // the initial-mount value, regardless of clock granularity.
    return new Promise<void>((resolve) => setTimeout(resolve, 5)).then(() => {
      act(() => {
        result.current.setRefreshPaused(false);
      });

      expect(result.current.refreshPaused).toBe(false);
      expect(result.current.lastRefresh).toBeGreaterThan(initialLastRefresh);
    });
  });

  it('does not bump `lastRefresh` when the auto-refresh switch is paused again', () => {
    const { result } = renderHook(() => useSyntheticsRefreshContext(), { wrapper });

    // Un-pause first to move past the initial-mount guard.
    act(() => {
      result.current.setRefreshPaused(false);
    });
    const lastRefreshAfterUnpause = result.current.lastRefresh;

    // Re-pausing should NOT trigger `refreshApp()`.
    act(() => {
      result.current.setRefreshPaused(true);
    });

    expect(result.current.refreshPaused).toBe(true);
    expect(result.current.lastRefresh).toBe(lastRefreshAfterUnpause);
  });

  it('exposes a `refreshApp` callback that bumps `lastRefresh`', () => {
    const { result } = renderHook(() => useSyntheticsRefreshContext(), { wrapper });
    const initialLastRefresh = result.current.lastRefresh;

    return new Promise<void>((resolve) => setTimeout(resolve, 5)).then(() => {
      act(() => {
        result.current.refreshApp();
      });

      expect(result.current.lastRefresh).toBeGreaterThan(initialLastRefresh);
    });
  });
});
