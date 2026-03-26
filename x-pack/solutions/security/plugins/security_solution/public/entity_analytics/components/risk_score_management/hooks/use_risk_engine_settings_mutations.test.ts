/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useRiskEngineSettingsMutations } from './use_risk_engine_settings_mutations';
import { useConfigureSORiskEngineMutation } from '../../../api/hooks/use_configure_risk_engine_saved_object';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useInvalidateRiskEngineSettingsQuery } from './use_risk_engine_settings_query';
import type { RiskScoreConfiguration } from '../common';

// Mock dependencies
jest.mock('../../../api/hooks/use_configure_risk_engine_saved_object');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('./use_risk_engine_settings_query');

const mockUseConfigureSORiskEngineMutation = useConfigureSORiskEngineMutation as jest.Mock;
const mockUseAppToasts = useAppToasts as jest.Mock;
const mockUseInvalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery as jest.Mock;

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

describe('useRiskEngineSettingsMutations', () => {
  const mockMutateAsync = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockInvalidateQueries = jest.fn();

  beforeEach(() => {
    mockUseConfigureSORiskEngineMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
    });

    mockUseAppToasts.mockReturnValue({
      addSuccess: mockAddSuccess,
    });

    mockUseInvalidateRiskEngineSettingsQuery.mockReturnValue(mockInvalidateQueries);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save settings successfully', async () => {
    const mockSettings: RiskScoreConfiguration = {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: [
        {
          entity_types: ['user'],
          filter: 'user.name: "test-user"',
        },
      ],
    };

    // Mock the mutation to call the onSuccess callback
    mockMutateAsync.mockImplementation((settings, options) => {
      if (options?.onSuccess) {
        options.onSuccess();
      }
      return Promise.resolve(undefined);
    });
    mockInvalidateQueries.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRiskEngineSettingsMutations(), {
      wrapper: createWrapper(),
    });

    await result.current.saveSelectedSettingsMutation.mutateAsync(mockSettings);

    expect(mockMutateAsync).toHaveBeenCalledWith(mockSettings, {
      onSuccess: expect.any(Function),
    });
    expect(mockAddSuccess).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it('should handle save errors', async () => {
    const mockSettings: RiskScoreConfiguration = {
      includeClosedAlerts: false,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      filters: [],
    };

    const error = new Error('Save failed');
    mockMutateAsync.mockRejectedValue(error);

    const { result } = renderHook(() => useRiskEngineSettingsMutations(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.saveSelectedSettingsMutation.mutateAsync(mockSettings)
    ).rejects.toThrow('Save failed');

    expect(mockMutateAsync).toHaveBeenCalledWith(mockSettings, {
      onSuccess: expect.any(Function),
    });
    expect(mockAddSuccess).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should track pre-save state when refs are provided', async () => {
    const mockSettings: RiskScoreConfiguration = {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: [],
    };

    const savedSettings: RiskScoreConfiguration = {
      includeClosedAlerts: false,
      range: { start: 'now-30d', end: 'now' },
      enableResetToZero: true,
      filters: [
        {
          entity_types: ['host'],
          filter: 'host.name: "test-host"',
        },
      ],
    };

    const waitingForSaveRefetch = { current: false };
    const preSaveFilterCount = { current: 0 };

    mockMutateAsync.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useRiskEngineSettingsMutations(savedSettings, waitingForSaveRefetch, preSaveFilterCount),
      {
        wrapper: createWrapper(),
      }
    );

    await result.current.saveSelectedSettingsMutation.mutateAsync(mockSettings);

    expect(preSaveFilterCount.current).toBe(1); // savedSettings.filters.length
    expect(waitingForSaveRefetch.current).toBe(true);
  });
});
