/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFetchLatestScan } from './use_fetch_ongoing_tasks';
import {
  API_VERSIONS,
  DEFEND_INSIGHTS,
  DefendInsightStatusEnum,
} from '@kbn/elastic-assistant-common';

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

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.requireMock('@tanstack/react-query').useQuery;

describe('useFetchLatestScan', () => {
  const mockOnSuccess = jest.fn();
  const mockOnInsightGenerationFailure = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockImplementation((_queryKey: unknown, queryFn: unknown) => {
      if (typeof queryFn === 'function') {
        queryFn().catch(() => {});
      }
      return { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
    });
  });

  describe('single insight type', () => {
    it('should make single query with size parameter', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'test-insight',
            status: DefendInsightStatusEnum.succeeded,
            insights: [{ group: 'test', events: [{}, {}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        query: {
          endpoint_ids: ['endpoint-1'],
          size: 1,
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(2);
    });
  });

  describe('multiple insight types', () => {
    it('should make single query with size parameter for multiple types', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'test-insight-1',
            insightType: 'incompatible_antivirus',
            status: DefendInsightStatusEnum.succeeded,
            insights: [{ group: 'test', events: [{}] }],
          },
          {
            id: 'test-insight-2',
            insightType: 'policy_response_failure',
            status: DefendInsightStatusEnum.succeeded,
            insights: [{ group: 'test', events: [{}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        query: {
          endpoint_ids: ['endpoint-1'],
          size: 2,
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(2); // 1 event from each insight
    });

    it('should continue polling when insights are running', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'test-insight',
            status: DefendInsightStatusEnum.running,
            insights: [{ group: 'test', events: [{}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not call onSuccess when still running
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnInsightGenerationFailure).not.toHaveBeenCalled();
    });
    it('should call onInsightGenerationFailure when insights fail', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'test-insight',
            status: DefendInsightStatusEnum.failed,
            failureReason: 'Test failure',
            insights: [{ group: 'test', events: [{}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockOnInsightGenerationFailure).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should call onSuccess with 0 when no insights found', async () => {
      mockHttpGet.mockResolvedValue({ data: [] });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockOnSuccess).toHaveBeenCalledWith(0);
      expect(mockOnInsightGenerationFailure).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle query failures gracefully', async () => {
      mockHttpGet.mockRejectedValue(new Error('Query failed'));

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        query: {
          endpoint_ids: ['endpoint-1'],
          size: 2,
        },
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnInsightGenerationFailure).not.toHaveBeenCalled();
    });
  });

  describe('Event Count Calculation Edge Cases', () => {
    it('should handle insights without events properly', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'test-insight',
            status: DefendInsightStatusEnum.succeeded,
            insights: [
              { group: 'test', events: null },
              { group: 'test2' },
              { group: 'test3', events: [] },
              { group: 'test4', events: [{}, {}] },
            ],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockOnSuccess).toHaveBeenCalledWith(2);
      expect(mockOnInsightGenerationFailure).not.toHaveBeenCalled();
    });

    it('should correctly sum events across multiple insights', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'insight-1',
            insightType: 'incompatible_antivirus',
            status: DefendInsightStatusEnum.succeeded,
            insights: [
              { group: 'test1', events: [{}, {}, {}] },
              { group: 'test2', events: [{}] },
            ],
          },
          {
            id: 'insight-2',
            insightType: 'policy_response_failure',
            status: DefendInsightStatusEnum.succeeded,
            insights: [{ group: 'test3', events: [{}, {}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockOnSuccess).toHaveBeenCalledWith(6);
    });
  });

  describe('Mixed Status Scenarios', () => {
    it('should handle mixed insight statuses correctly - running takes precedence', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'running-insight',
            status: DefendInsightStatusEnum.running,
            insights: [{ group: 'test', events: [{}] }],
          },
          {
            id: 'succeeded-insight',
            status: DefendInsightStatusEnum.succeeded,
            insights: [{ group: 'test', events: [{}] }],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        query: {
          endpoint_ids: ['endpoint-1'],
          size: 2,
        },
      });
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnInsightGenerationFailure).not.toHaveBeenCalled();
    });

    it('should handle failed status with running status - failed takes precedence', async () => {
      mockHttpGet.mockResolvedValue({
        data: [
          {
            id: 'failed-insight',
            status: DefendInsightStatusEnum.failed,
            failureReason: 'Test failure',
            insights: [],
          },
          {
            id: 'running-insight',
            status: DefendInsightStatusEnum.running,
            insights: [],
          },
        ],
      });

      renderHook(() =>
        useFetchLatestScan({
          isPolling: false,
          endpointId: 'endpoint-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          onSuccess: mockOnSuccess,
          onInsightGenerationFailure: mockOnInsightGenerationFailure,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        query: {
          endpoint_ids: ['endpoint-1'],
          size: 2,
        },
      });
      expect(mockOnInsightGenerationFailure).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
