/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import '@kbn/react-query/mock';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { usePipelineData } from '.';
import type { PipelineDataResponse } from '.';

const mockHttp: HttpSetup = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

let queryClient: QueryClient;

const defaultProps = {
  executionId: 'execution-123',
  http: mockHttp,
  isEnabled: true,
  workflowId: 'workflow-456',
};

const mockPipelineDataResponse: PipelineDataResponse = {
  alert_retrieval: [
    {
      alerts: ['alert-1', 'alert-2'],
      alerts_context_count: 2,
      extraction_strategy: 'default_esql',
    },
  ],
  combined_alerts: {
    alerts: ['alert-1', 'alert-2'],
    alerts_context_count: 2,
  },
  generation: {
    attack_discoveries: [
      {
        alert_ids: ['alert-1'],
        details_markdown: 'Details of the attack',
        summary_markdown: 'Summary of the attack',
        title: 'Test Attack Discovery',
      },
    ],
    execution_uuid: 'exec-uuid-789',
    replacements: { anonymized: 'original' },
  },
  validated_discoveries: null,
};

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('usePipelineData', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe('when isEnabled is true', () => {
    it('fetches pipeline data from the correct endpoint', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          '/internal/attack_discovery/workflow/workflow-456/execution/execution-123',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });

    it('returns data when the request succeeds', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPipelineDataResponse);
      });
    });

    it('returns isLoading as true while fetching', () => {
      (mockHttp.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isError as true when the request fails', async () => {
      (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('returns the error when the request fails', async () => {
      const error = new Error('Network error');
      (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });

    it('does not include custom headers (handled by Kibana HTTP service)', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.not.objectContaining({
            headers: expect.anything(),
          })
        );
      });
    });

    it('includes version in the request', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            version: '1',
          })
        );
      });
    });
  });

  describe('when isEnabled is false', () => {
    it('does not fetch pipeline data', () => {
      renderHook(() => usePipelineData({ ...defaultProps, isEnabled: false }), { wrapper });

      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });

    it('returns undefined data', () => {
      const { result } = renderHook(() => usePipelineData({ ...defaultProps, isEnabled: false }), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
    });

    it('returns isLoading as false', async () => {
      const { result } = renderHook(() => usePipelineData({ ...defaultProps, isEnabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('returns isError as false', () => {
      const { result } = renderHook(() => usePipelineData({ ...defaultProps, isEnabled: false }), {
        wrapper,
      });

      expect(result.current.isError).toBe(false);
    });
  });

  describe('caching by execution_id', () => {
    it('uses execution_id in the query key for caching', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      const { result, rerender } = renderHook(
        (props: { isEnabled: boolean }) =>
          usePipelineData({ ...defaultProps, isEnabled: props.isEnabled }),
        { initialProps: { isEnabled: true }, wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPipelineDataResponse);
      });

      // Toggle off and back on - should use cached data without refetching
      rerender({ isEnabled: false });
      rerender({ isEnabled: true });

      // Should still have data from cache (only one fetch call)
      expect(mockHttp.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockPipelineDataResponse);
    });

    it('fetches again when execution_id changes', async () => {
      const secondResponse: PipelineDataResponse = {
        ...mockPipelineDataResponse,
        generation: {
          ...mockPipelineDataResponse.generation!,
          execution_uuid: 'new-exec-uuid',
        },
      };

      (mockHttp.fetch as jest.Mock)
        .mockResolvedValueOnce(mockPipelineDataResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result, rerender } = renderHook(
        (props: { executionId: string }) =>
          usePipelineData({ ...defaultProps, executionId: props.executionId }),
        { wrapper, initialProps: { executionId: 'execution-123' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPipelineDataResponse);
      });

      rerender({ executionId: 'execution-456' });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('response typing', () => {
    it('returns all snake_case fields in the response', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        const data = result.current.data;

        expect(data).toBeDefined();
        expect(data?.alert_retrieval).toBeDefined();
        expect(data?.combined_alerts).toBeDefined();
        expect(data?.generation).toBeDefined();
        expect(data?.validated_discoveries).toBeDefined();
      });
    });

    it('returns alert_retrieval with snake_case fields', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        const alertRetrieval = result.current.data?.alert_retrieval?.[0];

        expect(alertRetrieval?.alerts).toEqual(['alert-1', 'alert-2']);
        expect(alertRetrieval?.alerts_context_count).toBe(2);
        expect(alertRetrieval?.extraction_strategy).toBe('default_esql');
      });
    });

    it('returns generation with snake_case fields', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockPipelineDataResponse);

      const { result } = renderHook(() => usePipelineData({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        const generation = result.current.data?.generation;

        expect(generation?.attack_discoveries).toHaveLength(1);
        expect(generation?.execution_uuid).toBe('exec-uuid-789');
        expect(generation?.replacements).toEqual({ anonymized: 'original' });
      });
    });
  });
});
