/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useFetchPendingScans } from './use_fetch_pending_scans';
import { WORKFLOW_INSIGHTS_PENDING_ROUTE } from '../../../../../../../common/endpoint/constants';
import type { WorkflowInsightType } from '../../../../../../../common/endpoint/types/workflow_insights';

const TEST_INSIGHT_TYPES: WorkflowInsightType[] = [
  'incompatible_antivirus',
  'policy_response_failure',
];

const mockHttpGet = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { get: mockHttpGet } },
  }),
  useToasts: () => ({
    addDanger: mockAddDanger,
  }),
}));

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.requireMock('@kbn/react-query').useQuery;

describe('useFetchPendingScans', () => {
  const mockOnSuccess = jest.fn();
  const mockOnFailure = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockImplementation((_queryKey: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        queryFn({ signal: new AbortController().signal }).catch(() => {});
      }
      return { data: undefined, isLoading: false, error: null };
    });
  });

  describe('GET query shape', () => {
    it('GETs WORKFLOW_INSIGHTS_PENDING_ROUTE with insightTypes and endpointIds serialized as JSON', async () => {
      mockHttpGet.mockResolvedValue({ pending: [] });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      await new Promise((r) => setTimeout(r, 0));

      expect(mockHttpGet).toHaveBeenCalledWith(WORKFLOW_INSIGHTS_PENDING_ROUTE, {
        version: '1',
        query: {
          insightTypes: JSON.stringify(TEST_INSIGHT_TYPES),
          endpointIds: JSON.stringify(['ep-1']),
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('polling logic (refetchInterval)', () => {
    it('does not poll when isPolling is false', () => {
      let refetchIntervalResult: number | false = 9999;

      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          if (opts.refetchInterval) {
            refetchIntervalResult = opts.refetchInterval();
          }
          return { data: undefined, isLoading: false, error: null };
        }
      );

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: false,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(refetchIntervalResult).toBe(false);
    });

    it('returns poll interval when isPolling is true', () => {
      let refetchIntervalResult: number | false = false;

      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          if (opts.refetchInterval) {
            refetchIntervalResult = opts.refetchInterval();
          }
          return { data: undefined, isLoading: false, error: null };
        }
      );

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(refetchIntervalResult).toBeGreaterThan(0);
    });

    it('refetchInterval has no side effects (no onSuccess/onFailure/toast calls)', () => {
      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          if (opts.refetchInterval) {
            // Call refetchInterval multiple times to verify no side effects
            opts.refetchInterval();
            opts.refetchInterval();
          }
          return { data: undefined, isLoading: false, error: null };
        }
      );

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  describe('side effects via useEffect', () => {
    it('calls onSuccess when polling and data has empty pending array (mount poll)', () => {
      mockUseQuery.mockImplementation(() => {
        return { data: { pending: [] }, isLoading: false, error: null };
      });

      // scanTimestamp: 0 simulates mount polling where hasSeenRunning defaults to true
      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 0,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
    });

    it('calls onSuccess after seeing running executions then empty (user-triggered scan)', () => {
      const { rerender } = renderHook(
        ({
          data,
        }: {
          data:
            | { pending: Array<{ executionId: string; status: string; '@timestamp': string }> }
            | undefined;
        }) => {
          mockUseQuery.mockImplementation(() => ({
            data,
            isLoading: false,
            error: null,
          }));
          return useFetchPendingScans({
            endpointId: 'ep-1',
            insightTypes: TEST_INSIGHT_TYPES,
            isPolling: true,
            scanTimestamp: 1000,
            onSuccess: mockOnSuccess,
            onFailure: mockOnFailure,
          });
        },
        {
          initialProps: {
            data: { pending: [{ executionId: 'ex-1', status: 'running', '@timestamp': 'ts' }] },
          },
        }
      );

      // Running seen — onSuccess not called yet
      expect(mockOnSuccess).not.toHaveBeenCalled();

      // Poll returns empty — scan complete
      act(() => {
        rerender({ data: { pending: [] } });
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnFailure).not.toHaveBeenCalled();
    });

    it('calls onFailure when only failed/aborted executions remain', () => {
      mockUseQuery.mockImplementation(() => {
        return {
          data: {
            pending: [
              { executionId: 'exec-1', status: 'failed', '@timestamp': '2024-01-01T00:00:00Z' },
            ],
          },
          isLoading: false,
          error: null,
        };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnFailure).toHaveBeenCalledWith([]);
      // The hook calls onFailure() but does NOT show a toast — the component's
      // onFailure callback is responsible for showing the error toast.
      expect(mockAddDanger).not.toHaveBeenCalled();
    });

    it('passes failureReasons from terminal executions to onFailure', () => {
      mockUseQuery.mockImplementation(() => {
        return {
          data: {
            pending: [
              {
                executionId: 'exec-1',
                status: 'failed',
                '@timestamp': '2024-01-01T00:00:00Z',
                failureReason: 'Invalid token',
              },
              {
                executionId: 'exec-2',
                status: 'aborted',
                '@timestamp': '2024-01-01T00:00:00Z',
              },
            ],
          },
          isLoading: false,
          error: null,
        };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnFailure).toHaveBeenCalledWith(['Invalid token']);
    });

    it('does not call onSuccess or onFailure when running executions exist', () => {
      mockUseQuery.mockImplementation(() => {
        return {
          data: {
            pending: [
              { executionId: 'exec-1', status: 'running', '@timestamp': '2024-01-01T00:00:00Z' },
            ],
          },
          isLoading: false,
          error: null,
        };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
    });

    it('does not fire side effects when not polling', () => {
      mockUseQuery.mockImplementation(() => {
        return { data: { pending: [] }, isLoading: false, error: null };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: false,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
    });

    it('does not fire side effects when data is undefined', () => {
      mockUseQuery.mockImplementation(() => {
        return { data: undefined, isLoading: true, error: null };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
    });
  });

  describe('race condition prevention', () => {
    it('changing scanTimestamp invalidates query key, forcing a fresh fetch', () => {
      // When scanTimestamp changes (user clicks "Scan"), the query key changes.
      // React Query creates a fresh query with data=undefined.
      // The useEffect's `if (!data) return` guard prevents premature onSuccess.

      let capturedQueryKey: unknown;

      // Phase 1: initial render with data
      mockUseQuery.mockImplementation((queryKey: unknown, _queryFn: unknown, _opts: unknown) => {
        capturedQueryKey = queryKey;
        return { data: { pending: [] }, isLoading: false, error: null };
      });

      const { rerender } = renderHook(
        ({ scanTs }: { scanTs: number }) =>
          useFetchPendingScans({
            endpointId: 'ep-1',
            insightTypes: TEST_INSIGHT_TYPES,
            isPolling: true,
            scanTimestamp: scanTs,
            onSuccess: mockOnSuccess,
            onFailure: mockOnFailure,
          }),
        { initialProps: { scanTs: 1000 } }
      );

      expect(capturedQueryKey).toEqual(['fetchPendingScans-ep-1', 1000]);
      mockOnSuccess.mockClear();

      // Phase 2: scanTimestamp changes — React Query creates fresh query with data=undefined
      mockUseQuery.mockImplementation((queryKey: unknown, _queryFn: unknown, _opts: unknown) => {
        capturedQueryKey = queryKey;
        return { data: undefined, isLoading: true, error: null };
      });

      act(() => {
        rerender({ scanTs: 2000 });
      });

      expect(capturedQueryKey).toEqual(['fetchPendingScans-ep-1', 2000]);
      // onSuccess must NOT be called — data is undefined, so the guard prevents it
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnFailure).not.toHaveBeenCalled();
    });

    it('refetchInterval has no side effects even with stale cached data', () => {
      let refetchIntervalFn: (() => number | false) | undefined;

      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          refetchIntervalFn = opts.refetchInterval;
          // Return stale cached data (empty pending from previous poll)
          return { data: { pending: [] }, isLoading: false, error: null };
        }
      );

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      // The refetchInterval function should not have called onSuccess/onFailure
      if (refetchIntervalFn) {
        const result = refetchIntervalFn();
        // It should return a poll interval, not false (side effects are in useEffect only)
        expect(typeof result).toBe('number');
      }

      expect(mockOnFailure).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('calls onFailure and resets pollStartedAt on timeout', () => {
      const realDateNow = Date.now;
      let currentTime = 1000;

      Date.now = () => currentTime;

      let refetchIntervalFn: (() => number | false) | undefined;
      const queryData: unknown = undefined;

      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          refetchIntervalFn = opts.refetchInterval;
          return { data: queryData, isLoading: false, error: null };
        }
      );

      const { rerender } = renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      // First refetchInterval call initializes pollStartedAt
      if (refetchIntervalFn) {
        const result1 = refetchIntervalFn();
        expect(result1).toBeGreaterThan(0);
      }

      // Jump past timeout
      currentTime = 1000 + 6 * 60 * 1000;

      // refetchInterval should return false (stop polling)
      if (refetchIntervalFn) {
        const result2 = refetchIntervalFn();
        expect(result2).toBe(false);
      }

      // Trigger a re-render so useEffect detects the timeout
      act(() => {
        rerender();
      });

      expect(mockOnFailure).toHaveBeenCalledWith([]);
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('timed out'),
        })
      );

      Date.now = realDateNow;
    });

    it('pollStartedAt is reset on timeout so re-scan works', () => {
      const realDateNow = Date.now;
      let currentTime = 1000;

      Date.now = () => currentTime;

      let refetchIntervalFn: (() => number | false) | undefined;

      mockUseQuery.mockImplementation(
        (
          _queryKey: unknown,
          _queryFn: unknown,
          opts: { refetchInterval?: () => number | false }
        ) => {
          refetchIntervalFn = opts.refetchInterval;
          return { data: undefined, isLoading: false, error: null };
        }
      );

      const { rerender } = renderHook(
        ({ polling }: { polling: boolean }) =>
          useFetchPendingScans({
            endpointId: 'ep-1',
            insightTypes: TEST_INSIGHT_TYPES,
            isPolling: polling,
            scanTimestamp: 1000,
            onSuccess: mockOnSuccess,
            onFailure: mockOnFailure,
          }),
        { initialProps: { polling: true } }
      );

      // Initialize poll
      if (refetchIntervalFn) {
        refetchIntervalFn();
      }

      // Jump past timeout
      currentTime = 1000 + 6 * 60 * 1000;

      // Re-render triggers useEffect which detects timeout and resets pollStartedAt
      act(() => {
        rerender({ polling: true });
      });

      // After timeout, onFailure is called and pollStartedAt is reset
      expect(mockOnFailure).toHaveBeenCalledWith([]);
      mockOnFailure.mockClear();
      mockAddDanger.mockClear();

      // Now simulate a re-scan: reset time and re-render
      currentTime = 2000;

      act(() => {
        rerender({ polling: true });
      });

      // The refetchInterval should work normally (not immediately timeout)
      if (refetchIntervalFn) {
        const result = refetchIntervalFn();
        expect(result).toBeGreaterThan(0);
      }

      Date.now = realDateNow;
    });
  });

  describe('AbortError handling', () => {
    it('suppresses error toast for AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockHttpGet.mockRejectedValue(abortError);

      mockUseQuery.mockImplementation((_queryKey: unknown, queryFn: unknown) => {
        if (typeof queryFn === 'function') {
          queryFn({ signal: new AbortController().signal }).catch(() => {});
        }
        return { data: undefined, isLoading: false, error: null };
      });

      renderHook(() =>
        useFetchPendingScans({
          endpointId: 'ep-1',
          insightTypes: TEST_INSIGHT_TYPES,
          isPolling: true,
          scanTimestamp: 1000,
          onSuccess: mockOnSuccess,
          onFailure: mockOnFailure,
        })
      );

      await new Promise((r) => setTimeout(r, 0));

      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });
});
