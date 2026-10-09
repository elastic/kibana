/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFetchInsightsAB } from './use_fetch_insights_ab';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';

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

describe('useFetchInsightsAB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockImplementation((_queryKey: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        queryFn({ signal: new AbortController().signal }).catch(() => {});
      }
      return { data: undefined, isLoading: false, error: null };
    });
  });

  describe('cache key', () => {
    it('includes scanTimestamp in query key to avoid stale cache collisions', () => {
      let capturedKey: unknown;
      mockUseQuery.mockImplementation((key: unknown) => {
        capturedKey = key;
        return { data: undefined };
      });

      renderHook(() =>
        useFetchInsightsAB({
          endpointId: 'ep-1',
          scanTimestamp: 99999,
          insightTypes: ['incompatible_antivirus'],
        })
      );

      expect(capturedKey).toEqual(['fetchInsights-ab-ep-1', 99999]);
    });
  });

  describe('always fetches on mount', () => {
    it('does not pass enabled option to useQuery', () => {
      let capturedOpts: Record<string, unknown> = {};
      mockUseQuery.mockImplementation(
        (_key: unknown, _fn: unknown, opts: Record<string, unknown>) => {
          capturedOpts = opts;
          return { data: undefined };
        }
      );

      renderHook(() =>
        useFetchInsightsAB({
          endpointId: 'ep-1',
          scanTimestamp: 12345,
          insightTypes: ['incompatible_antivirus'],
        })
      );

      expect(capturedOpts.enabled).toBeUndefined();
    });
  });

  describe('GET query shape', () => {
    it('GETs WORKFLOW_INSIGHTS_ROUTE with targetIds, types, actionTypes, and size', async () => {
      mockHttpGet.mockResolvedValue([]);

      renderHook(() =>
        useFetchInsightsAB({
          endpointId: 'ep-1',
          scanTimestamp: 12345,
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        })
      );

      await new Promise((r) => setTimeout(r, 0));

      expect(mockHttpGet).toHaveBeenCalledWith(WORKFLOW_INSIGHTS_ROUTE, {
        version: '1',
        query: {
          targetIds: JSON.stringify(['ep-1']),
          types: JSON.stringify(['incompatible_antivirus', 'policy_response_failure']),
          actionTypes: JSON.stringify(['refreshed']),
          size: 100,
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('AbortError handling', () => {
    it('returns empty array for AbortError without showing toast', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockHttpGet.mockRejectedValue(abortError);

      renderHook(() =>
        useFetchInsightsAB({
          endpointId: 'ep-1',
          scanTimestamp: 12345,
          insightTypes: ['incompatible_antivirus'],
        })
      );

      await new Promise((r) => setTimeout(r, 0));

      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });
});
