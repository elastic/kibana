/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { i18n } from '@kbn/i18n';

import { useSampleDataStatus } from './use_sample_data_status';
import { useKibana } from './use_kibana';
import { useQuery } from '@kbn/react-query';
import { QueryKeys } from '../constants';

jest.mock('./use_kibana');
jest.mock('@kbn/react-query');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useSampleDataStatus', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  beforeAll(() => {
    // Always return defaultMessage to avoid relying on translation bundles
    jest.spyOn(i18n, 'translate').mockImplementation((_, opts: any) => opts?.defaultMessage);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        sampleDataIngest: {
          getStatus: jest.fn(),
        },
        notifications: {
          toasts: { addSuccess, addError },
        },
      },
    } as any);
  });

  it('calls useQuery with correct options and computes refetchInterval from status', () => {
    mockUseQuery.mockReturnValue({
      data: { status: 'installed' },
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    renderHook(() => useSampleDataStatus());

    expect(mockUseQuery).toHaveBeenCalledTimes(1);
    const args = mockUseQuery.mock.calls[0][0] as any;

    expect(args.queryKey).toEqual([QueryKeys.FetchSampleDataStatus]);
    expect(typeof args.queryFn).toBe('function');
    expect(args.enabled).toBe(true);
    expect(args.refetchOnMount).toBe('always');
    expect(typeof args.refetchInterval).toBe('function');

    expect(args.refetchInterval({ status: 'installing' })).toBe(5000);
    expect(args.refetchInterval({ status: 'installed' })).toBe(false);
    expect(args.refetchInterval({ status: 'error' })).toBe(false);
    expect(args.refetchInterval(undefined)).toBe(false);
  });

  it('maps returned fields correctly', () => {
    const refetch = jest.fn();

    mockUseQuery.mockReturnValue({
      data: {
        status: 'installed',
        indexName: 'foo-index',
        dashboardId: 'dash-123',
      },
      isLoading: false,
      refetch,
    } as any);

    const { result } = renderHook(() => useSampleDataStatus());

    expect(result.current).toEqual({
      isInstalled: true,
      isInstalling: false,
      indexName: 'foo-index',
      dashboardId: 'dash-123',
      isLoading: false,
      refetch,
    });
  });

  it('shows success toast on transition installing → installed', () => {
    // Mutable query state to drive status transitions
    const queryState: any = {
      data: { status: 'installing' },
      isLoading: false,
      refetch: jest.fn(),
    };
    mockUseQuery.mockImplementation(() => queryState);

    const { rerender } = renderHook(() => useSampleDataStatus());

    act(() => {
      queryState.data = { status: 'installed' };
      rerender();
    });

    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('shows error toast on transition installing → error', () => {
    const queryState: any = {
      data: { status: 'installing' },
      isLoading: false,
      refetch: jest.fn(),
    };
    mockUseQuery.mockImplementation(() => queryState);

    const { rerender } = renderHook(() => useSampleDataStatus());

    act(() => {
      queryState.data = { status: 'error' };
      rerender();
    });

    expect(addError).toHaveBeenCalledTimes(1);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('sets enabled=false when plugin is missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        sampleDataIngest: undefined,
        notifications: { toasts: { addSuccess, addError } },
      },
    } as any);

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    } as any);

    renderHook(() => useSampleDataStatus());

    const args = mockUseQuery.mock.calls[0][0] as any;
    expect(args.enabled).toBe(false);
  });

  it('sets enabled=false when getStatus is missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        sampleDataIngest: {
          /* no getStatus */
        },
        notifications: { toasts: { addSuccess, addError } },
      },
    } as any);

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    } as any);

    renderHook(() => useSampleDataStatus());

    const args = mockUseQuery.mock.calls[0][0] as any;
    expect(args.enabled).toBe(false);
  });
});
