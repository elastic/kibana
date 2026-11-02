/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useAttacksPrivileges } from './use_attacks_privileges';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import { useGetMissingIndexPrivileges } from '../../../../attack_discovery/pages/use_get_missing_index_privileges';

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../attack_discovery/pages/use_get_missing_index_privileges');

const mockUseAlertsPrivileges = useAlertsPrivileges as jest.MockedFunction<
  typeof useAlertsPrivileges
>;
const mockUseGetMissingIndexPrivileges = useGetMissingIndexPrivileges as jest.MockedFunction<
  typeof useGetMissingIndexPrivileges
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useAttacksPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
  });

  it('should return true for both privileges when user has access', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: true,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current).toEqual({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });
  });

  it('should return false for attack index write when missing privileges exist', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: true,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [{ index_name: 'test-index', privileges: ['write'] }],
      isLoading: false,
    } as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current).toEqual({
      hasIndexWrite: true,
      hasAttackIndexWrite: false,
      loading: false,
    });
  });

  it('should return false for detection index write when user lacks access', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: false,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current).toEqual({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });
  });

  it('should return loading true when detection privileges are loading', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: true,
      loading: true,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('should return loading true when attack privileges are loading', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: true,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('should handle null hasIndexWrite', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: null,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current.hasIndexWrite).toBe(false);
  });

  it('should handle undefined missingIndexPrivileges data', () => {
    mockUseAlertsPrivileges.mockReturnValue({
      hasIndexWrite: true,
      loading: false,
    } as ReturnType<typeof useAlertsPrivileges>);

    mockUseGetMissingIndexPrivileges.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useGetMissingIndexPrivileges>);

    const { result } = renderHook(() => useAttacksPrivileges(), { wrapper });

    expect(result.current.hasAttackIndexWrite).toBe(true);
  });
});
