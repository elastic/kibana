/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useToggleEntityAnalytics } from './use_toggle_entity_analytics';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addSuccess: mockAddSuccess, addError: mockAddError }),
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

const mockInstallEntityStore = jest.fn().mockResolvedValue({});
const mockStartEntityStore = jest.fn().mockResolvedValue({});
const mockStopEntityStore = jest.fn().mockResolvedValue({});

let mockEntityStoreStatusReturn: { data: { status: string; engines: unknown[] } | undefined };

jest.mock('../components/entity_store/hooks/use_entity_store', () => ({
  useInstallEntityStoreMutation: () => ({
    mutateAsync: mockInstallEntityStore,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStartEntityStoreMutation: () => ({
    mutateAsync: mockStartEntityStore,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useStopEntityStoreMutation: () => ({
    mutateAsync: mockStopEntityStore,
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
jest.mock('../components/risk_score_management/hooks/use_risk_engine_settings_query', () => ({
  useInvalidateRiskEngineSettingsQuery: () => mockInvalidateRiskEngineSettingsQuery,
}));

let mockRiskEngineStatusReturn: {
  data: { risk_engine_status: string } | undefined;
  isFetching: boolean;
};

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
jest.mock('../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {
        get: () => mockIsEntityStoreV2Enabled,
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
  });

  describe('toggle ON from not_installed', () => {
    it('installs entity store and inits risk engine without calling start', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);
      expect(mockStartEntityStore).not.toHaveBeenCalled();
      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);

      const entityStoreCallOrder = mockInstallEntityStore.mock.invocationCallOrder[0];
      const riskEngineCallOrder = mockInitRiskEngine.mock.invocationCallOrder[0];
      expect(entityStoreCallOrder).toBeLessThan(riskEngineCallOrder);

      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('does not call start after install to avoid race condition with server-side async setup', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);
      expect(mockStartEntityStore).not.toHaveBeenCalled();
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

  describe('toggle ON from disabled/stopped', () => {
    beforeEach(() => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'DISABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'stopped', engines: [] },
      };
    });

    it('starts stopped entity store before enabling risk engine', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
      expect(mockEnableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockInstallEntityStore).not.toHaveBeenCalled();

      const entityStoreCallOrder = mockStartEntityStore.mock.invocationCallOrder[0];
      const riskEngineCallOrder = mockEnableRiskEngine.mock.invocationCallOrder[0];
      expect(entityStoreCallOrder).toBeLessThan(riskEngineCallOrder);
    });
  });

  describe('toggle ON from error state', () => {
    it('starts entity store without reinstalling when status is error', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'DISABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = { data: { status: 'error', engines: [] } };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggle OFF from enabled/running', () => {
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
      expect(mockStopEntityStore).toHaveBeenCalledTimes(1);
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
      expect(mockStopEntityStore).not.toHaveBeenCalled();
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
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
      expect(mockStopEntityStore).toHaveBeenCalledTimes(1);
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
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
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
      expect(mockStopEntityStore).not.toHaveBeenCalled();
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

      expect(mockStopEntityStore).toHaveBeenCalledTimes(1);
      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
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
      expect(mockStopEntityStore).not.toHaveBeenCalled();
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
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
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockStopEntityStore).not.toHaveBeenCalled();
    });
  });

  describe('concurrent toggle guard', () => {
    it('blocks a second toggle while the first is still in flight', async () => {
      let resolveInit: () => void;
      mockInitRiskEngine.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        })
      );

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      let firstToggle: Promise<void>;
      await act(async () => {
        firstToggle = result.current.toggle();
      });

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveInit!();
        await firstToggle!;
      });
    });
  });

  describe('onSaveSettings failure', () => {
    it('does not call initRiskEngine and shows error toast when onSaveSettings rejects', async () => {
      mockSaveSettings.mockRejectedValueOnce(new Error('save failed'));

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
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });

  describe('entity store v2 toggle', () => {
    beforeEach(() => {
      mockIsEntityStoreV2Enabled = true;
    });

    it('only stops entity store on toggle OFF (ignores risk engine)', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStopEntityStore).toHaveBeenCalledTimes(1);
      expect(mockDisableRiskEngine).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('starts entity store and enables risk maintainer on toggle ON from stopped', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'DISABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'stopped', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
      expect(mockEnableRiskEngine).toHaveBeenCalledTimes(1);
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
    });

    it('installs entity store and inits risk maintainer on toggle ON from not_installed', async () => {
      mockEntityStoreStatusReturn = {
        data: { status: 'not_installed', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);
      expect(mockInitRiskEngine).toHaveBeenCalledTimes(1);
    });

    it('saves dirty settings before risk engine init on toggle ON', async () => {
      mockEntityStoreStatusReturn = {
        data: { status: 'not_installed', engines: [] },
      };

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

      const saveOrder = mockSaveSettings.mock.invocationCallOrder[0];
      const initOrder = mockInitRiskEngine.mock.invocationCallOrder[0];
      expect(saveOrder).toBeLessThan(initOrder);
    });

    it('skips risk maintainer start when it is already enabled', async () => {
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

      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
      expect(mockEnableRiskEngine).not.toHaveBeenCalled();
      expect(mockInitRiskEngine).not.toHaveBeenCalled();
    });
  });

  describe('error toast on mutation failure', () => {
    it('shows error toast when initRiskEngine rejects', async () => {
      mockInitRiskEngine.mockRejectedValueOnce(new Error('init failed'));

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it('shows error toast when installEntityStore rejects', async () => {
      mockInstallEntityStore.mockRejectedValueOnce(new Error('store install failed'));

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });

    it('shows error toast when disableRiskEngine rejects during toggle OFF', async () => {
      mockRiskEngineStatusReturn = {
        data: { risk_engine_status: 'ENABLED' },
        isFetching: false,
      };
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };
      mockDisableRiskEngine.mockRejectedValueOnce(new Error('disable failed'));

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });
});
