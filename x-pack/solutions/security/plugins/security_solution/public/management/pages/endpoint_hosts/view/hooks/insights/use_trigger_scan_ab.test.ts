/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useTriggerScanAB } from './use_trigger_scan_ab';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';

const mockHttpPost = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { post: mockHttpPost } },
  }),
  useToasts: () => ({
    addDanger: mockAddDanger,
  }),
}));

jest.mock('@kbn/react-query', () => ({
  useMutation: jest.fn(),
}));

const mockUseMutation = jest.requireMock('@kbn/react-query').useMutation;

describe('useTriggerScanAB', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  let mockMutate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate = jest.fn();
    mockUseMutation.mockImplementation(
      (
        mutationFn: (payload: unknown) => Promise<unknown>,
        opts: { onSuccess: (data: unknown) => void; onError: (err: unknown) => void }
      ) => {
        mockMutate.mockImplementation(async (payload) => {
          try {
            const result = await mutationFn(payload);
            opts.onSuccess(result);
            return result;
          } catch (err) {
            opts.onError(err);
            throw err;
          }
        });
        return { isLoading: false, mutate: mockMutate };
      }
    );
  });

  describe('POST shape', () => {
    it('posts to WORKFLOW_INSIGHTS_ROUTE with insightTypes and endpointIds array', async () => {
      mockHttpPost.mockResolvedValue({
        executions: [
          { executionId: 'exec-1', insightType: 'incompatible_antivirus', endpointId: 'ep-1' },
        ],
      });

      const { result } = renderHook(() =>
        useTriggerScanAB({ onSuccess: mockOnSuccess, onError: mockOnError })
      );

      await act(async () => {
        await result.current.mutate({
          endpointId: 'ep-1',
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          connectorId: 'connector-1',
        });
      });

      expect(mockHttpPost).toHaveBeenCalledWith(WORKFLOW_INSIGHTS_ROUTE, {
        version: '1',
        body: JSON.stringify({
          insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
          endpointIds: ['ep-1'],
          connectorId: 'connector-1',
        }),
      });
    });

    it('calls onSuccess with executions array on success', async () => {
      const executions = [
        { executionId: 'exec-1', insightType: 'incompatible_antivirus', endpointId: 'ep-1' },
      ];
      mockHttpPost.mockResolvedValue({ executions });

      const { result } = renderHook(() =>
        useTriggerScanAB({ onSuccess: mockOnSuccess, onError: mockOnError })
      );

      await act(async () => {
        await result.current.mutate({
          endpointId: 'ep-1',
          insightTypes: ['incompatible_antivirus'],
          connectorId: 'connector-1',
        });
      });

      expect(mockOnSuccess).toHaveBeenCalledWith({
        executions,
        failures: undefined,
      });
    });

    it('calls onError and shows danger toast on failure', async () => {
      mockHttpPost.mockRejectedValue({ body: { message: 'connector not found' } });

      const { result } = renderHook(() =>
        useTriggerScanAB({ onSuccess: mockOnSuccess, onError: mockOnError })
      );

      await act(async () => {
        try {
          await result.current.mutate({
            endpointId: 'ep-1',
            insightTypes: ['incompatible_antivirus'],
            connectorId: 'connector-1',
          });
        } catch {
          // expected
        }
      });

      expect(mockOnError).toHaveBeenCalled();
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'connector not found' })
      );
    });
  });
});
