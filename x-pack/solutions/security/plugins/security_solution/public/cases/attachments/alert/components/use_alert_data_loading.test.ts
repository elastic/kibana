/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useAlertDataLoading } from './use_alert_data_loading';

const mockRefetch = jest.fn();

const baseParams = {
  hasRuleIdFromMetadata: false,
  loadingAlertData: false,
  loadingPrivileges: false,
  hasAlertsRead: true,
  alertsData: {} as Record<string, unknown>,
  alertId: 'a1',
  refetchAlertData: mockRefetch,
};

describe('useAlertDataLoading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns false when alert data is present and nothing is loading', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({
        ...baseParams,
        alertsData: { a1: { 'kibana.alert.rule.name': 'My rule' } },
      })
    );
    expect(result.current).toBe(false);
  });

  it('returns false when the rule ID is already in metadata (no live fetch needed)', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({ ...baseParams, hasRuleIdFromMetadata: true })
    );
    expect(result.current).toBe(false);
  });

  it('returns true while alert data is loading', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({ ...baseParams, loadingAlertData: true })
    );
    expect(result.current).toBe(true);
  });

  it('returns true while privileges are loading (needsLiveFetch=true)', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({ ...baseParams, loadingPrivileges: true, refetchAlertData: null })
    );
    expect(result.current).toBe(true);
  });

  it('returns false while privileges are loading when rule ID is already in metadata', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({
        ...baseParams,
        hasRuleIdFromMetadata: true,
        loadingPrivileges: true,
        refetchAlertData: null,
      })
    );
    expect(result.current).toBe(false);
  });

  it('returns true when refetchAlertData is null (first fetch not yet started)', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({ ...baseParams, refetchAlertData: null })
    );
    expect(result.current).toBe(true);
  });

  it('returns false when refetchAlertData is null but user has no alert read access', () => {
    const { result } = renderHook(() =>
      useAlertDataLoading({ ...baseParams, hasAlertsRead: false, refetchAlertData: null })
    );
    expect(result.current).toBe(false);
  });

  describe('retry behaviour', () => {
    it('returns true (retry pending) when first fetch completes with no matching data', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAlertDataLoading(baseParams));
      expect(result.current).toBe(true);
    });

    it('fires refetchAlertData after 300ms and returns false after the retry', () => {
      jest.useFakeTimers();
      // Empty alertsData → first fetch returned no data → retry should fire.
      const { result, rerender } = renderHook(() => useAlertDataLoading(baseParams));

      expect(result.current).toBe(true);
      expect(mockRefetch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);

      // hasRetried.current=true after the callback runs. A re-render picks it up.
      rerender();
      expect(result.current).toBe(false);
    });

    it('does not fire a retry when rule ID is already in metadata', () => {
      jest.useFakeTimers();
      renderHook(() => useAlertDataLoading({ ...baseParams, hasRuleIdFromMetadata: true }));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('does not fire a second retry after the first has already run', () => {
      jest.useFakeTimers();
      const { rerender } = renderHook(() => useAlertDataLoading(baseParams));

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);

      rerender();

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
