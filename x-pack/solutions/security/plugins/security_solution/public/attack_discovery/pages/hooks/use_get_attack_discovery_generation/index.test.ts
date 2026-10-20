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

import { useGetAttackDiscoveryGeneration } from '.';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

const mockHttp: HttpSetup = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

let queryClient: QueryClient;

const defaultProps = {
  executionUuid: 'exec-uuid-123',
  http: mockHttp,
};

const mockGeneration: AttackDiscoveryGeneration = {
  alerts_context_count: 10,
  connector_id: 'connector-1',
  discoveries: 3,
  end: '2026-04-15T12:00:30.000Z',
  execution_uuid: 'exec-uuid-123',
  loading_message: 'Analyzing alerts...',
  start: '2026-04-15T12:00:00.000Z',
  status: 'succeeded',
};

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useGetAttackDiscoveryGeneration', () => {
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

  describe('when executionUuid is provided', () => {
    it('fetches from the correct single-generation endpoint', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce({ generation: mockGeneration });

      renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps }), { wrapper });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.stringContaining('exec-uuid-123'),
          expect.objectContaining({ method: 'GET' })
        );
      });
    });

    it('returns the generation from the response', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce({ generation: mockGeneration });

      const { result } = renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.generation).toEqual(mockGeneration);
      });
    });

    it('returns undefined generation before the first fetch completes', () => {
      (mockHttp.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps }), {
        wrapper,
      });

      expect(result.current.generation).toBeUndefined();
    });

    it('returns isLoading true while fetching', () => {
      (mockHttp.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps }), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false after a successful fetch', async () => {
      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce({ generation: mockGeneration });

      const { result } = renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('when executionUuid is null', () => {
    it('does not fetch', () => {
      renderHook(() => useGetAttackDiscoveryGeneration({ ...defaultProps, executionUuid: null }), {
        wrapper,
      });

      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });

    it('returns undefined generation', () => {
      const { result } = renderHook(
        () => useGetAttackDiscoveryGeneration({ ...defaultProps, executionUuid: null }),
        { wrapper }
      );

      expect(result.current.generation).toBeUndefined();
    });
  });

  describe('when executionUuid is undefined', () => {
    it('does not fetch', () => {
      renderHook(
        () => useGetAttackDiscoveryGeneration({ ...defaultProps, executionUuid: undefined }),
        { wrapper }
      );

      expect(mockHttp.fetch).not.toHaveBeenCalled();
    });
  });
});
