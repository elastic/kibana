/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useToggleEntityAnalytics } from './use_toggle_entity_analytics';

const mockAddSuccess = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess }),
}));

const mockInitRiskEngine = jest.fn().mockResolvedValue({});
const mockEnableRiskEngine = jest.fn().mockResolvedValue({});
const mockDisableRiskEngine = jest.fn().mockResolvedValue({});

jest.mock('../api/hooks/use_init_risk_engine_mutation', () => ({
  useInitRiskEngineMutation: () => ({
    mutateAsync: mockInitRiskEngine,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('../api/hooks/use_enable_risk_engine_mutation', () => ({
  useEnableRiskEngineMutation: () => ({
    mutateAsync: mockEnableRiskEngine,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('../api/hooks/use_disable_risk_engine_mutation', () => ({
  useDisableRiskEngineMutation: () => ({
    mutateAsync: mockDisableRiskEngine,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

const mockEnableEntityStore = jest.fn().mockResolvedValue({});
const mockStartEntityEngine = jest.fn().mockResolvedValue({});
const mockStopEntityEngine = jest.fn().mockResolvedValue({});

jest.mock('../components/entity_store/hooks/use_entity_store', () => ({
  useEnableEntityStoreMutation: () => ({
    mutateAsync: mockEnableEntityStore,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStartEntityEngineMutation: () => ({
    mutateAsync: mockStartEntityEngine,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStopEntityEngineMutation: () => ({
    mutateAsync: mockStopEntityEngine,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useEntityStoreStatus: () => mockEntityStoreStatusReturn,
}));

jest.mock('./use_enabled_entity_types', () => ({
  useEntityStoreTypes: () => ['host', 'user'],
}));

const mockInvalidateRiskEngineSettingsQuery = jest.fn().mockResolvedValue(undefined);
jest.mock(
  '../components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks',
  () => ({
    useInvalidateRiskEngineSettingsQuery: () => mockInvalidateRiskEngineSettingsQuery,
  })
);

let mockRiskEngineStatusReturn: {
  data: { risk_engine_status: string } | undefined;
  isFetching: boolean;
};
let mockEntityStoreStatusReturn: { data: { status: string; engines: unknown[] } | undefined };

const mockUseRiskEngineStatus = jest.fn(() => mockRiskEngineStatusReturn);
jest.mock('../api/hooks/use_risk_engine_status', () => ({
  useRiskEngineStatus: (...args: unknown[]) => mockUseRiskEngineStatus(...(args as [])),
  useInvalidateRiskEngineStatusQuery: () => jest.fn(),
}));

let mockIsEntityStoreDisabled: boolean;
jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (flag: string) => {
    if (flag === 'entityStoreDisabled') return mockIsEntityStoreDisabled;
    return false;
  },
}));

const mockSaveSettings = jest.fn().mockResolvedValue(undefined);
const defaultOptions = {
  selectedSettingsMatchSavedSettings: true,
  saveSelectedSettingsMutation: {
    mutateAsync: mockSaveSettings,
    isLoading: false,
  } as never,
};

describe('useToggleEntityAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEntityStoreDisabled = false;
    mockRiskEngineStatusReturn = {
      data: { risk_engine_status: 'NOT_INSTALLED' },
      isFetching: false,
    };
    mockEntityStoreStatusReturn = {
      data: { status: 'not_installed', engines: [] },
    };
  });

  describe('toggle ON from not_installed', () => {
    it('inits risk engine then enables entity store', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockEnableEntityStore).toHaveBeenCalledWith({});
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('saves dirty settings before init', async () => {
      const { result } = renderHook(() =>
        useToggleEntityAnalytics({
          ...defaultOptions,
          selectedSettingsMatchSavedSettings: false,
        })
      );

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockSaveSettings).toHaveBeenCalledTimes(1);
      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggle ON from disabled', () => {
    beforeEach(() => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'DISABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'stopped', engines: [] },
      };
    });

    it('enables risk engine and starts stopped entity engines', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockEnableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockStartEntityEngine).toHaveBeenCalledTimes(1);
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
    });
  });

  describe('toggle OFF from enabled', () => {
    beforeEach(() => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };
    });

    it('disables risk engine and stops entity store in parallel', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockDisableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockStopEntityEngine).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggle OFF from partially_enabled', () => {
    it('disables risk engine only when store is already stopped', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'stopped', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockDisableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockStopEntityEngine).not.toHaveBeenCalled();
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
    });

    it('stops entity store only when risk engine is already disabled', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'DISABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockStopEntityEngine).toHaveBeenCalledTimes(1);
      expect(mockEnableRiskEngine).not.toHaveBeenCalled();
    });
  });

  describe('entity store feature flag disabled', () => {
    beforeEach(() => {
      mockIsEntityStoreDisabled = true;
    });

    it('only inits risk engine on toggle ON', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
    });

    it('only disables risk engine on toggle OFF', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockDisableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockStopEntityEngine).not.toHaveBeenCalled();
    });
  });

  describe('partially_enabled disables whatever is running', () => {
    it('stops entity store when store is running but risk engine is not installed', async () => {
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStopEntityEngine).toHaveBeenCalledTimes(1);
      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
    });

    it('disables risk engine when risk is enabled but store is not installed', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'not_installed', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockDisableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockStopEntityEngine).not.toHaveBeenCalled();
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
    });
  });
});
