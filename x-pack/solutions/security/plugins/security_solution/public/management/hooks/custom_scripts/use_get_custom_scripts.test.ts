/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import {
  useGetCustomScripts,
  getMessageFieldFromStringifiedObject,
} from './use_get_custom_scripts';

jest.mock('@tanstack/react-query');
jest.mock('../../../common/lib/kibana');

describe('useGetCustomScripts', () => {
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
  const mockHttpGet = jest.fn();
  const mockNotifications = { toasts: { danger: jest.fn() } };
  const mockUseKibana = jest.requireMock('../../../common/lib/kibana').useKibana;
  const mockUseHttp = jest.requireMock('../../../common/lib/kibana').useHttp;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the useHttp hook
    mockUseHttp.mockReturnValue({
      get: mockHttpGet,
    });

    // Mock the useKibana hook
    mockUseKibana.mockReturnValue({ notifications: mockNotifications });

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

  test('displays a toast notification on error and only once per error', async () => {
    // Override the default mock for this test
    mockHttpGet.mockRejectedValue({
      body: {
        message: 'Response body: {"error":{"code":"Forbidden","message":"Test error message"}}',
      },
    });

    renderHook(() => useGetCustomScripts('endpoint'));

    const queryOptions = mockUseQuery.mock.calls[0][0] as UseQueryOptions<unknown, unknown>;
    const queryFn = queryOptions.queryFn as () => Promise<unknown>;

    // Simulate error thrown in queryFn
    try {
      await queryFn();
    } catch (e) {}
    expect(mockNotifications.toasts.danger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Forbidden',
        body: expect.any(Object),
      })
    );
    // Call again, should not show another toast
    try {
      await queryFn();
    } catch (e) {}
    expect(mockNotifications.toasts.danger).toHaveBeenCalledTimes(1);
  });

  describe('getMessageFieldFromStringifiedObject', () => {
    it('parses error JSON from stringified response', () => {
      const str =
        'Some error. Response body: {"error":{"code":"Forbidden","message":"Test error"}}';
      const result = getMessageFieldFromStringifiedObject(str);
      expect(result).toEqual({ error: { code: 'Forbidden', message: 'Test error' } });
    });
    it('returns undefined if marker is missing', () => {
      const str = 'No marker here';
      expect(getMessageFieldFromStringifiedObject(str)).toBeUndefined();
    });
    it('returns undefined if JSON is invalid', () => {
      const str = 'Response body: not-json';
      expect(getMessageFieldFromStringifiedObject(str)).toBeUndefined();
    });
  });
});
