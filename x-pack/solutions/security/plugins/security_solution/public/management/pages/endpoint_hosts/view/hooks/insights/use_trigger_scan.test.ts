/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useTriggerScan } from './use_trigger_scan';
import { API_VERSIONS, DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';

const mockHttpPost = jest.fn();

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { post: mockHttpPost } },
  }),
  useToasts: () => ({
    addWarning: jest.fn(),
    addDanger: jest.fn(),
  }),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: () => ({ data: { data: [] } }),
  })
);

jest.mock('@kbn/react-query', () => ({
  useMutation: jest.fn(),
}));

const mockUseMutation = jest.requireMock('@kbn/react-query').useMutation;

describe('useTriggerScan', () => {
  const mockOnSuccess = jest.fn();
  let mockMutate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate = jest.fn();
    mockUseMutation.mockImplementation((mutationFn: (payload: unknown) => Promise<unknown>) => {
      mockMutate.mockImplementation(async (payload) => {
        return mutationFn(payload);
      });
      return {
        isLoading: false,
        mutate: mockMutate,
        data: undefined,
        error: null,
      };
    });
  });

  describe('basic functionality', () => {
    it('should trigger scan for single insight type', async () => {
      mockHttpPost.mockResolvedValue({ id: 'scan-result' });

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      await act(async () => {
        await result.current.mutate({
          endpointId: 'endpoint-1',
          connectorId: 'connector-1',
          actionTypeId: 'action-1',
          insightTypes: ['incompatible_antivirus'],
        });
      });

      expect(mockHttpPost).toHaveBeenCalledTimes(1);
      expect(mockHttpPost).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          endpointIds: ['endpoint-1'],
          insightType: 'incompatible_antivirus',
          anonymizationFields: [],
          replacements: {},
          subAction: 'invokeAI',
          apiConfig: {
            connectorId: 'connector-1',
            actionTypeId: 'action-1',
          },
        }),
      });
    });

    it('should return empty array when no insight types provided', async () => {
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      const scanResult = await act(async () => {
        return result.current.mutate({
          endpointId: 'endpoint-1',
          connectorId: 'connector-1',
          actionTypeId: 'action-1',
          insightTypes: [],
        });
      });

      expect(mockHttpPost).not.toHaveBeenCalled();
      expect(scanResult).toEqual([]);
    });
  });

  describe('multiple insight types', () => {
    it('should trigger parallel scans for all provided insight types', async () => {
      mockHttpPost.mockResolvedValue({ id: 'scan-result' });

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      await act(async () => {
        await result.current.mutate({
          endpointId: 'endpoint-1',
          connectorId: 'connector-1',
          actionTypeId: 'action-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        });
      });

      // Should make parallel POST calls for both insight types
      expect(mockHttpPost).toHaveBeenCalledTimes(2);
      expect(mockHttpPost).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          endpointIds: ['endpoint-1'],
          insightType: 'incompatible_antivirus',
          anonymizationFields: [],
          replacements: {},
          subAction: 'invokeAI',
          apiConfig: {
            connectorId: 'connector-1',
            actionTypeId: 'action-1',
          },
        }),
      });
      expect(mockHttpPost).toHaveBeenCalledWith(DEFEND_INSIGHTS, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          endpointIds: ['endpoint-1'],
          insightType: 'policy_response_failure',
          anonymizationFields: [],
          replacements: {},
          subAction: 'invokeAI',
          apiConfig: {
            connectorId: 'connector-1',
            actionTypeId: 'action-1',
          },
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should handle partial scan failures gracefully', async () => {
      mockHttpPost
        .mockResolvedValueOnce({ id: 'success-result' })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      const scanResult = await act(async () => {
        return result.current.mutate({
          endpointId: 'endpoint-1',
          connectorId: 'connector-1',
          actionTypeId: 'action-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        });
      });

      expect(mockHttpPost).toHaveBeenCalledTimes(2);
      expect(scanResult).toEqual([{ id: 'success-result' }]); // Only successful results returned
    });
  });
});
