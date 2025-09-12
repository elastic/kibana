/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as ReactUse from 'react-use/lib/useLocalStorage';
import { useAttackDiscoveryHistoryTimerange } from '.';

describe('useAttackDiscoveryHistoryTimerange', () => {
  const defaultStart = 'now-24h';
  const defaultEnd = 'now';
  const customStart = '2024-01-01T00:00:00Z';
  const customEnd = '2024-01-02T00:00:00Z';

  describe('when localStorage is empty', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest
        .spyOn(ReactUse, 'default')
        .mockReturnValueOnce([undefined, jest.fn(), jest.fn()])
        .mockReturnValueOnce([undefined, jest.fn(), jest.fn()]);
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
    jest
      .spyOn(ReactUse, 'default')
      .mockReturnValueOnce([customStart, jest.fn(), jest.fn()])
      .mockReturnValueOnce([undefined, jest.fn(), jest.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    expect(result.current.historyStart).toBe(customStart);
  });

  it('returns custom end value from localStorage', () => {
    jest
      .spyOn(ReactUse, 'default')
      .mockReturnValueOnce([undefined, jest.fn(), jest.fn()])
      .mockReturnValueOnce([customEnd, jest.fn(), jest.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    expect(result.current.historyEnd).toBe(customEnd);
  });

  it('setHistoryStart updates the value', () => {
    const setHistoryStart = jest.fn();
    jest
      .spyOn(ReactUse, 'default')
      .mockReturnValueOnce([customStart, setHistoryStart, jest.fn()])
      .mockReturnValueOnce([customEnd, jest.fn(), jest.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    act(() => {
      result.current.setHistoryStart('new-start');
    });

    expect(setHistoryStart).toHaveBeenCalledWith('new-start');
  });

  it('setHistoryEnd updates the value', () => {
    const setHistoryEnd = jest.fn();
    jest
      .spyOn(ReactUse, 'default')
      .mockReturnValueOnce([customStart, jest.fn(), jest.fn()])
      .mockReturnValueOnce([customEnd, setHistoryEnd, jest.fn()]);

    const { result } = renderHook(() => useAttackDiscoveryHistoryTimerange());

    act(() => {
      result.current.setHistoryEnd('new-end');
    });

    expect(setHistoryEnd).toHaveBeenCalledWith('new-end');
  });
});
