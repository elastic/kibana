/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useGetCustomScripts } from './use_get_custom_scripts';
import { useHttp } from '../../../common/lib/kibana';
import type { HttpSetup } from '@kbn/core/public';

jest.mock('@tanstack/react-query');
jest.mock('../../../common/lib/kibana');

describe('useGetCustomScripts', () => {
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
  const mockUseHttp = useHttp as jest.MockedFunction<typeof useHttp>;
  const mockHttpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the useHttp hook
    mockUseHttp.mockReturnValue({
      get: mockHttpGet,
    } as unknown as HttpSetup);

    // Mock the useQuery hook to return successful response
    mockUseQuery.mockReturnValue({
      data: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isStale: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>);

    // Mock HTTP get to return successful response
    mockHttpGet.mockResolvedValue({
      data: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
    });
  });

  test('calls useQuery with correct parameters for endpoint agent type', () => {
    renderHook(() => useGetCustomScripts('endpoint'));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['get-custom-scripts', 'endpoint'],
      queryFn: expect.any(Function),
    });
  });

  test('calls useQuery with correct parameters for crowdstrike agent type', () => {
    renderHook(() => useGetCustomScripts('crowdstrike'));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['get-custom-scripts', 'crowdstrike'],
      queryFn: expect.any(Function),
    });
  });

  test('calls useQuery with correct parameters for sentinel_one agent type', () => {
    renderHook(() => useGetCustomScripts('sentinel_one'));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['get-custom-scripts', 'sentinel_one'],
      queryFn: expect.any(Function),
    });
  });

  test('makes HTTP request with correct parameters', async () => {
    renderHook(() => useGetCustomScripts('endpoint'));

    const queryOptions = mockUseQuery.mock.calls[0][0] as UseQueryOptions<unknown, unknown>;
    const queryFn = queryOptions.queryFn as () => Promise<unknown>;

    await queryFn();

    expect(mockHttpGet).toHaveBeenCalledWith('/api/endpoint/action/custom_scripts', {
      version: '1',
      query: {
        agentType: 'endpoint',
      },
    });
  });
});
