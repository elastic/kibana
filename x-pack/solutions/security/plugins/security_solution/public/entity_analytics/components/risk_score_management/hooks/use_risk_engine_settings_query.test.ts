/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import {
  useRiskEngineSettingsQuery,
  useInvalidateRiskEngineSettingsQuery,
} from './use_risk_engine_settings_query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { RiskScoreConfiguration } from '../common';

// Mock the API hook
jest.mock('../../../api/api');
const mockUseEntityAnalyticsRoutes = useEntityAnalyticsRoutes as jest.Mock;

// Mock React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useRiskEngineSettingsQuery', () => {
  const mockFetchRiskEngineSettings = jest.fn();

  beforeEach(() => {
    mockUseEntityAnalyticsRoutes.mockReturnValue({
      fetchRiskEngineSettings: mockFetchRiskEngineSettings,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch risk engine settings successfully', async () => {
    const mockSettings: RiskScoreConfiguration = {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: [
        {
          entity_types: ['user', 'host'],
          filter: 'host.name: "test-host"',
        },
      ],
    };

    mockFetchRiskEngineSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useRiskEngineSettingsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingRiskEngineSettings).toBe(false);
    });

    expect(result.current.savedRiskEngineSettings).toEqual(mockSettings);
    expect(result.current.isError).toBe(false);
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    mockFetchRiskEngineSettings.mockRejectedValue(error);

    const { result } = renderHook(() => useRiskEngineSettingsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingRiskEngineSettings).toBe(false);
    });

    expect(result.current.savedRiskEngineSettings).toBeUndefined();
    expect(result.current.isError).toBe(true);
  });

  it('should transform backend filters correctly', async () => {
    const mockBackendResponse = {
      includeClosedAlerts: false,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      filters: [
        {
          entity_types: ['user'],
          filter: 'user.name: "test-user"',
        },
      ],
    };

    mockFetchRiskEngineSettings.mockResolvedValue(mockBackendResponse);

    const { result } = renderHook(() => useRiskEngineSettingsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingRiskEngineSettings).toBe(false);
    });

    expect(result.current.savedRiskEngineSettings).toEqual(mockBackendResponse);
  });

  it('should handle empty filters array', async () => {
    const mockBackendResponse = {
      includeClosedAlerts: false,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      filters: [],
    };

    mockFetchRiskEngineSettings.mockResolvedValue(mockBackendResponse);

    const { result } = renderHook(() => useRiskEngineSettingsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoadingRiskEngineSettings).toBe(false);
    });

    expect(result.current.savedRiskEngineSettings).toEqual(mockBackendResponse);
  });
});

describe('useInvalidateRiskEngineSettingsQuery', () => {
  it('should return a function that invalidates queries', () => {
    const { result } = renderHook(() => useInvalidateRiskEngineSettingsQuery(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });
});
