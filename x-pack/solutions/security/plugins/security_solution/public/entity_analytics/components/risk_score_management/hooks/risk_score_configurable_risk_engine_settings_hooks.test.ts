/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useConfigurableRiskEngineSettings } from './risk_score_configurable_risk_engine_settings_hooks';
import { useRiskEngineSettingsQuery } from './use_risk_engine_settings_query';
import { useRiskEngineSettingsMutations } from './use_risk_engine_settings_mutations';
import { useRiskEngineSettingsState } from './use_risk_engine_settings_state';

// Mock the individual hooks
jest.mock('./use_risk_engine_settings_query');
jest.mock('./use_risk_engine_settings_mutations');
jest.mock('./use_risk_engine_settings_state');

const mockUseRiskEngineSettingsQuery = useRiskEngineSettingsQuery as jest.Mock;
const mockUseRiskEngineSettingsMutations = useRiskEngineSettingsMutations as jest.Mock;
const mockUseRiskEngineSettingsState = useRiskEngineSettingsState as jest.Mock;

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

describe('useConfigurableRiskEngineSettings', () => {
  const mockQueryResult = {
    savedRiskEngineSettings: {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: [
        {
          entity_types: ['user'],
          filter: 'user.name: "test-user"',
        },
      ],
    },
    isLoadingRiskEngineSettings: false,
    isError: false,
  };

  const mockStateResult = {
    selectedRiskEngineSettings: {
      includeClosedAlerts: true,
      range: { start: 'now-7d', end: 'now' },
      enableResetToZero: false,
      filters: [
        {
          entity_types: ['user'],
          filter: 'user.name: "test-user"',
        },
      ],
    },
    selectedSettingsMatchSavedSettings: true,
    resetSelectedSettings: jest.fn(),
    setSelectedDateSetting: jest.fn(),
    toggleSelectedClosedAlertsSetting: jest.fn(),
    toggleScoreRetainment: jest.fn(),
    setAlertFilters: jest.fn(),
    getUIAlertFilters: jest.fn().mockReturnValue([
      {
        id: 'filter-0-1234567890',
        text: 'user.name: "test-user"',
        entityTypes: ['user'],
      },
    ]),
    waitingForSaveRefetch: { current: false },
    preSaveFilterCount: { current: 0 },
  };

  const mockMutationsResult = {
    saveSelectedSettingsMutation: {
      mutateAsync: jest.fn(),
      isLoading: false,
    },
  };

  beforeEach(() => {
    mockUseRiskEngineSettingsQuery.mockReturnValue(mockQueryResult);
    mockUseRiskEngineSettingsState.mockReturnValue(mockStateResult);
    mockUseRiskEngineSettingsMutations.mockReturnValue(mockMutationsResult);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should combine all hook results correctly', () => {
    const { result } = renderHook(() => useConfigurableRiskEngineSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual({
      savedRiskEngineSettings: mockQueryResult.savedRiskEngineSettings,
      selectedRiskEngineSettings: mockStateResult.selectedRiskEngineSettings,
      selectedSettingsMatchSavedSettings: mockStateResult.selectedSettingsMatchSavedSettings,
      resetSelectedSettings: mockStateResult.resetSelectedSettings,
      setSelectedDateSetting: mockStateResult.setSelectedDateSetting,
      toggleSelectedClosedAlertsSetting: mockStateResult.toggleSelectedClosedAlertsSetting,
      saveSelectedSettingsMutation: mockMutationsResult.saveSelectedSettingsMutation,
      isLoadingRiskEngineSettings: mockQueryResult.isLoadingRiskEngineSettings,
      toggleScoreRetainment: mockStateResult.toggleScoreRetainment,
      setAlertFilters: mockStateResult.setAlertFilters,
      getUIAlertFilters: mockStateResult.getUIAlertFilters,
    });
  });

  it('should pass correct parameters to state hook', () => {
    renderHook(() => useConfigurableRiskEngineSettings(), {
      wrapper: createWrapper(),
    });

    expect(mockUseRiskEngineSettingsState).toHaveBeenCalledWith(
      mockQueryResult.savedRiskEngineSettings,
      mockQueryResult.isLoadingRiskEngineSettings,
      mockQueryResult.isError
    );
  });

  it('should pass correct parameters to mutations hook', () => {
    renderHook(() => useConfigurableRiskEngineSettings(), {
      wrapper: createWrapper(),
    });

    expect(mockUseRiskEngineSettingsMutations).toHaveBeenCalledWith(
      mockQueryResult.savedRiskEngineSettings,
      mockStateResult.waitingForSaveRefetch,
      mockStateResult.preSaveFilterCount
    );
  });

  it('should handle loading state', () => {
    const loadingQueryResult = {
      ...mockQueryResult,
      isLoadingRiskEngineSettings: true,
    };

    mockUseRiskEngineSettingsQuery.mockReturnValue(loadingQueryResult);

    const { result } = renderHook(() => useConfigurableRiskEngineSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoadingRiskEngineSettings).toBe(true);
  });

  it('should handle error state', () => {
    const errorQueryResult = {
      ...mockQueryResult,
      isError: true,
      savedRiskEngineSettings: undefined,
    };

    mockUseRiskEngineSettingsQuery.mockReturnValue(errorQueryResult);

    const { result } = renderHook(() => useConfigurableRiskEngineSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.savedRiskEngineSettings).toBeUndefined();
  });
});
