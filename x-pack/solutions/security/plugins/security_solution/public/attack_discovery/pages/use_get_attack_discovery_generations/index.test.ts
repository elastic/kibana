/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import '@kbn/react-query/mock';
import { QueryClient, QueryClientProvider, useQueryClient } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useGetAttackDiscoveryGenerations, useInvalidateGetAttackDiscoveryGenerations } from '.';
import { ATTACK_DISCOVERY_GENERATIONS } from '@kbn/elastic-assistant-common';
import { ERROR_RETRIEVING_ATTACK_DISCOVERY_GENERATIONS } from './translations';

const mockAddError = jest.fn();
const useQueryClientMock = useQueryClient as unknown as jest.MockedFn<typeof useQueryClient>;

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  }),
  get mockAddError() {
    return mockAddError;
  },
}));

const mockHttp: HttpSetup = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

let queryClient: QueryClient;
const defaultProps = {
  http: mockHttp,
  isAssistantEnabled: true,
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-02T00:00:00.000Z',
  size: 10,
};

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useGetAttackDiscoveryGenerations', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
  });

  it('calls addError with the expected title', async () => {
    const errorBody = { message: 'Server error message' };
    const error = { body: errorBody };
    (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(error);

    renderHook(() => useGetAttackDiscoveryGenerations({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      const callArgs = mockAddError.mock.calls[0];
      expect(callArgs[1]?.title).toBe(ERROR_RETRIEVING_ATTACK_DISCOVERY_GENERATIONS);
    });
  });

  it('returns an error when a server error body is present', async () => {
    const errorBody = { message: 'Server error message' };
    const error = { body: errorBody };
    (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGetAttackDiscoveryGenerations({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('returns data when the request succeeds', async () => {
    const mockData = { generations: [{ id: '1' }] };
    (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useGetAttackDiscoveryGenerations({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });
});

describe('useInvalidateGetAttackDiscoveryGenerations', () => {
  it('calls invalidateQueries with public generations route', () => {
    const invalidateQueries = jest.fn();
    useQueryClientMock.mockReturnValue({ invalidateQueries } as unknown as ReturnType<
      typeof useQueryClient
    >);

    const { result } = renderHook(() => useInvalidateGetAttackDiscoveryGenerations());
    result.current();

    expect(invalidateQueries).toHaveBeenCalledWith(['GET', ATTACK_DISCOVERY_GENERATIONS], {
      refetchType: 'all',
    });
  });
});
