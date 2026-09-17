/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { PrivMonHealthResponse } from '../../../common/api/entity_analytics';
import { TestProviders } from '../../common/mock';
import {
  usePrivilegedMonitoringHealth,
  useUserLimitStatus,
} from './use_privileged_monitoring_health';

const mockFetchPrivilegeMonitoringEngineStatus = jest.fn();

jest.mock('../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchPrivilegeMonitoringEngineStatus: mockFetchPrivilegeMonitoringEngineStatus,
  }),
}));

const healthResponse: PrivMonHealthResponse = {
  status: 'started',
  users: { current_count: 2, max_allowed: 10 },
};

describe('privileged monitoring health query callbacks', () => {
  beforeEach(() => {
    mockFetchPrivilegeMonitoringEngineStatus.mockReset();
    mockFetchPrivilegeMonitoringEngineStatus.mockResolvedValue(healthResponse);
  });

  it('fetches health without passing React Query metadata as execution context', async () => {
    const { result } = renderHook(() => usePrivilegedMonitoringHealth(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.healthData).toEqual(healthResponse));

    expect(mockFetchPrivilegeMonitoringEngineStatus).toHaveBeenCalledTimes(1);
    expect(mockFetchPrivilegeMonitoringEngineStatus).toHaveBeenCalledWith();
    expect(result.current.userStats?.remainingSlots).toBe(8);
  });

  it('fetches user limits without passing React Query metadata as execution context', async () => {
    const { result } = renderHook(() => useUserLimitStatus(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchPrivilegeMonitoringEngineStatus).toHaveBeenCalledTimes(1);
    expect(mockFetchPrivilegeMonitoringEngineStatus).toHaveBeenCalledWith();
    expect(result.current.userStats?.remainingSlots).toBe(8);
  });
});
