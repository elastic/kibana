/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useAttackDiscoveryHistoryTimerange } from '.';

vi.mock('react-use/lib/useLocalStorage', { spy: true });

describe('useAttackDiscoveryHistoryTimerange', () => {
  const defaultStart = 'now-24h';
  const defaultEnd = 'now';
  const customStart = '2024-01-01T00:00:00Z';
  const customEnd = '2024-01-02T00:00:00Z';

  describe('when localStorage is empty', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(useLocalStorage)
        .mockReturnValueOnce([undefined, vi.fn(), vi.fn()])
        .mockReturnValueOnce([undefined, vi.fn(), vi.fn()]);
    });

    it('returns the default historyStart value', () => {
      const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

      expect(result.current.historyStart).toBe(defaultStart);
    });

    it('returns the default historyEnd value', () => {
      const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

      expect(result.current.historyEnd).toBe(defaultEnd);
    });
  });

  it('returns a custom start value from localStorage', () => {
    vi.mocked(useLocalStorage)
      .mockReturnValueOnce([customStart, vi.fn(), vi.fn()])
      .mockReturnValueOnce([undefined, vi.fn(), vi.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    expect(result.current.historyStart).toBe(customStart);
  });

  it('returns custom end value from localStorage', () => {
    vi.mocked(useLocalStorage)
      .mockReturnValueOnce([undefined, vi.fn(), vi.fn()])
      .mockReturnValueOnce([customEnd, vi.fn(), vi.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    expect(result.current.historyEnd).toBe(customEnd);
  });

  it('setHistoryStart updates the value', () => {
    const setHistoryStart = vi.fn();
    vi.mocked(useLocalStorage)
      .mockReturnValueOnce([customStart, setHistoryStart, vi.fn()])
      .mockReturnValueOnce([customEnd, vi.fn(), vi.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    act(() => {
      result.current.setHistoryStart('new-start');
    });

    expect(setHistoryStart).toHaveBeenCalledWith('new-start');
  });

  it('setHistoryEnd updates the value', () => {
    const setHistoryEnd = vi.fn();
    vi.mocked(useLocalStorage)
      .mockReturnValueOnce([customStart, vi.fn(), vi.fn()])
      .mockReturnValueOnce([customEnd, setHistoryEnd, vi.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    act(() => {
      result.current.setHistoryEnd('new-end');
    });

    expect(setHistoryEnd).toHaveBeenCalledWith('new-end');
  });
});
