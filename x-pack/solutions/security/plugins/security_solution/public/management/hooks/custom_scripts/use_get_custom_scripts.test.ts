/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import type { UseQueryOptions } from '@kbn/react-query';
import { useGetCustomScripts } from './use_get_custom_scripts';
import { useHttp } from '../../../common/lib/kibana';
import type { HttpSetup } from '@kbn/core/public';

jest.mock('@kbn/react-query');
jest.mock('../../../common/lib/kibana');

describe('useGetCustomScripts', () => {
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
  const mockUseHttp = useHttp as jest.MockedFunction<typeof useHttp>;
  let mockHttpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HTTP get to return successful response
    mockHttpGet = jest.fn(async () => {
      return {
        data: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
      };
    });

    // Mock the useHttp hook
    mockUseHttp.mockReset();
    mockUseHttp.mockReturnValue({
      get: mockHttpGet,
    } as unknown as HttpSetup);

    // Mock the useQuery hook to return successful response
    mockUseQuery.mockReset();
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

    expect(mockHttpGet).toHaveBeenCalledWith('/internal/api/endpoint/action/custom_scripts', {
      version: '1',
      query: {
        agentType: 'endpoint',
      },
    });
  });

  it('should include additional query params in API call', async () => {
    renderHook(() => useGetCustomScripts('sentinel_one', { osType: 'linux' }));
    const queryOptions = mockUseQuery.mock.calls[0][0] as UseQueryOptions<unknown, unknown>;
    const queryFn = queryOptions.queryFn as () => Promise<unknown>;
    await queryFn();

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/api/endpoint/action/custom_scripts', {
        version: '1',
        query: {
          agentType: 'sentinel_one',
          osType: 'linux',
        },
      });
    });
  });

  it('should use custom options', async () => {
    renderHook(() => useGetCustomScripts('sentinel_one', undefined, { cacheTime: 1 }));

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['get-custom-scripts', 'sentinel_one'],
      queryFn: expect.any(Function),
      cacheTime: 1,
    });
  });
});
