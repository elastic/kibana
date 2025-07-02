/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useGetCustomScripts } from './use_get_custom_scripts';

jest.mock('@tanstack/react-query');
jest.mock('../../../common/lib/kibana');

describe('useGetCustomScripts', () => {
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
  const mockHttpGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the useHttp hook
    jest.requireMock('../../../common/lib/kibana').useHttp.mockReturnValue({
      get: mockHttpGet,
    });

    // Mock the useQuery hook
    mockUseQuery.mockReturnValue({
      data: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
      isLoading: false,
      isError: false,
      error: null,
      // Add other required properties for UseQueryResult
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
});
