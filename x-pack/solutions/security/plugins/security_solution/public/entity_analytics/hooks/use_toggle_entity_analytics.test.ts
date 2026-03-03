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

let mockInitRiskEngineMutationReturn: {
  mutateAsync: jest.Mock;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

jest.mock('../api/hooks/use_init_risk_engine_mutation', () => ({
  useInitRiskEngineMutation: () => mockInitRiskEngineMutationReturn,
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
const mockInstallEntityStoreV2 = jest.fn().mockResolvedValue({});
const mockStartEntityStoreV2 = jest.fn().mockResolvedValue({});
const mockStopEntityStoreV2 = jest.fn().mockResolvedValue({});

let mockEntityStoreStatusV2Return: { data: { status: string; engines: unknown[] } | undefined };

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
  useEntityStoreStatusV2: () => mockEntityStoreStatusV2Return,
  useInstallEntityStoreMutationV2: () => ({
    mutateAsync: mockInstallEntityStoreV2,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStartEntityStoreMutationV2: () => ({
    mutateAsync: mockStartEntityStoreV2,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStopEntityStoreMutationV2: () => ({
    mutateAsync: mockStopEntityStoreV2,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('./use_enabled_entity_types', () => ({
  useEntityStoreTypes: () => ['host', 'user'],
}));

const mockInvalidateRiskEngineSettingsQuery = jest.fn().mockResolvedValue(undefined);
jest.mock('../components/risk_score_management/hooks/use_risk_engine_settings_query', () => ({
  useInvalidateRiskEngineSettingsQuery: () => mockInvalidateRiskEngineSettingsQuery,
}));

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

let mockIsEntityStoreV2Enabled: boolean;
jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {
        get: (key: string) => {
          if (key === 'securitySolution:entityStoreEnableV2') return mockIsEntityStoreV2Enabled;
          return undefined;
        },
      },
    },
  }),
}));

const mockSaveSettings = jest.fn().mockResolvedValue(undefined);
const defaultOptions = {
  selectedSettingsMatchSavedSettings: true,
  onSaveSettings: mockSaveSettings,
  isSavingSettings: false,
};

describe('useToggleEntityAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEntityStoreDisabled = false;
    mockIsEntityStoreV2Enabled = false;
    mockInitRiskEngineMutationReturn = {
      mutateAsync: mockInitRiskEngine,
      isLoading: false,
      isError: false,
      error: null,
    };
    mockRiskEngineStatusReturn = {
      data: { risk_engine_status: 'NOT_INSTALLED' },
      isFetching: false,
    };
    mockEntityStoreStatusReturn = {
      data: { status: 'not_installed', engines: [] },
    };
    mockEntityStoreStatusV2Return = {
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

  describe('error reporting', () => {
    it('surfaces risk engine init errors via the errors object', () => {
      mockInitRiskEngineMutationReturn = {
        mutateAsync: mockInitRiskEngine,
        isLoading: false,
        isError: true,
        error: { body: { message: 'Risk engine init failed' } },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      expect(result.current.errors.riskEngine).toContain('Risk engine init failed');
      expect(result.current.errors.entityStore).toHaveLength(0);
    });

    it('uses fallback message when error has no body', () => {
      mockInitRiskEngineMutationReturn = {
        mutateAsync: mockInitRiskEngine,
        isLoading: false,
        isError: true,
        error: new Error('network failure'),
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      expect(result.current.errors.riskEngine).toContain('An unknown error occurred');
    });
  });

  describe('isLoading guard', () => {
    it('is a no-op when isSavingSettings makes isLoading true', async () => {
      const { result } = renderHook(() =>
        useToggleEntityAnalytics({
          ...defaultOptions,
          isSavingSettings: true,
        })
      );

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockEnableEntityStore).not.toHaveBeenCalled();
      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockStopEntityEngine).not.toHaveBeenCalled();
    });
  });

  describe('entity store v2 feature flag enabled', () => {
    beforeEach(() => {
      mockIsEntityStoreV2Enabled = true;
    });

    describe('toggle ON from not_installed', () => {
      it('installs and starts entity store via v2 endpoints', async () => {
        mockEntityStoreStatusV2Return = { data: { status: 'not_installed', engines: [] } };

        const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

        await act(async () => {
          await result.current.toggle();
        });

        expect(mockInstallEntityStoreV2).toHaveBeenCalledTimes(1);
        expect(mockStartEntityStoreV2).toHaveBeenCalledTimes(1);
        expect(mockEnableEntityStore).not.toHaveBeenCalled();
        expect(mockStartEntityEngine).not.toHaveBeenCalled();
        expect(mockAddSuccess).toHaveBeenCalled();
      });
    });

    describe('toggle ON from stopped', () => {
      it('starts entity store via v2 without reinstalling', async () => {
        mockRiskEngineStatusReturn = {
          data: { risk_engine_status: 'DISABLED' },
          isFetching: false,
        };
        mockEntityStoreStatusV2Return = { data: { status: 'stopped', engines: [] } };

        const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

        await act(async () => {
          await result.current.toggle();
        });

        expect(mockInstallEntityStoreV2).not.toHaveBeenCalled();
        expect(mockStartEntityStoreV2).toHaveBeenCalledTimes(1);
        expect(mockEnableEntityStore).not.toHaveBeenCalled();
      });
    });

    describe('toggle ON from running', () => {
      it('does not call install or start when already running', async () => {
        mockRiskEngineStatusReturn = {
          data: { risk_engine_status: 'DISABLED' },
          isFetching: false,
        };
        mockEntityStoreStatusV2Return = { data: { status: 'running', engines: [] } };

        const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

        await act(async () => {
          await result.current.toggle();
        });

        expect(mockInstallEntityStoreV2).not.toHaveBeenCalled();
        expect(mockStartEntityStoreV2).not.toHaveBeenCalled();
      });
    });

    describe('toggle OFF from running', () => {
      it('stops entity store via v2 endpoint', async () => {
        mockRiskEngineStatusReturn = {
          data: { risk_engine_status: 'ENABLED' },
          isFetching: false,
        };
        mockEntityStoreStatusV2Return = { data: { status: 'running', engines: [] } };

        const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

        await act(async () => {
          await result.current.toggle();
        });

        expect(mockStopEntityStoreV2).toHaveBeenCalledTimes(1);
        expect(mockStopEntityEngine).not.toHaveBeenCalled();
        expect(mockAddSuccess).toHaveBeenCalled();
      });
    });

    describe('v1 entity store endpoints not called when v2 is enabled', () => {
      it('never calls v1 enable/start/stop mutations', async () => {
        mockEntityStoreStatusV2Return = { data: { status: 'not_installed', engines: [] } };

        const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

        await act(async () => {
          await result.current.toggle();
        });

        expect(mockEnableEntityStore).not.toHaveBeenCalled();
        expect(mockStartEntityEngine).not.toHaveBeenCalled();
        expect(mockStopEntityEngine).not.toHaveBeenCalled();
      });
    });
  });
});
