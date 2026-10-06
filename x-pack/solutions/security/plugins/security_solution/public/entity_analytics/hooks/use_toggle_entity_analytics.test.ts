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

const mockInstallEntityStore = jest.fn().mockResolvedValue({});
const mockStartEntityStore = jest.fn().mockResolvedValue({});
const mockStopEntityStore = jest.fn().mockResolvedValue({});

let mockInstallEntityStoreMutationReturn: {
  mutateAsync: jest.Mock;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

let mockEntityStoreStatusReturn: {
  data: { status: string; engines: unknown[] } | undefined;
  isLoading?: boolean;
};

jest.mock('../components/entity_store/hooks/use_entity_store', () => ({
  useInstallEntityStoreMutation: () => mockInstallEntityStoreMutationReturn,
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

const mockSaveSettings = jest.fn().mockResolvedValue(undefined);
const defaultOptions = {
  selectedSettingsMatchSavedSettings: true,
  onSaveSettings: mockSaveSettings,
  isSavingSettings: false,
};

describe('useToggleEntityAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstallEntityStoreMutationReturn = {
      mutateAsync: mockInstallEntityStore,
      isLoading: false,
      isError: false,
      error: null,
    };
    mockEntityStoreStatusReturn = {
      data: { status: 'not_installed', engines: [] },
      isLoading: false,
    };
  });

  describe('toggle ON from not_installed', () => {
    it('installs entity store without calling start', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);
      expect(mockStartEntityStore).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalled();
    });

    it('saves dirty settings before installing the entity store', async () => {
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
      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);

      const saveOrder = mockSaveSettings.mock.invocationCallOrder[0];
      const installOrder = mockInstallEntityStore.mock.invocationCallOrder[0];
      expect(saveOrder).toBeLessThan(installOrder);
    });
  });

  describe('toggle ON from stopped', () => {
    beforeEach(() => {
      mockEntityStoreStatusReturn = {
        data: { status: 'stopped', engines: [] },
      };
    });

    it('starts entity store without reinstalling', async () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
    });
  });

  describe('toggle ON from error state', () => {
    it('starts entity store without reinstalling when status is error', async () => {
      mockEntityStoreStatusReturn = { data: { status: 'error', engines: [] } };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockStartEntityStore).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggle OFF from running', () => {
    it('only stops entity store', async () => {
      mockEntityStoreStatusReturn = {
        data: { status: 'running', engines: [] },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockStopEntityStore).toHaveBeenCalledTimes(1);
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockStartEntityStore).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalled();
    });
  });

  describe('error reporting', () => {
    it('surfaces entity store install errors via the errors object', () => {
      mockInstallEntityStoreMutationReturn = {
        mutateAsync: mockInstallEntityStore,
        isLoading: false,
        isError: true,
        error: { body: { message: 'Entity store install failed' } },
      };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      expect(result.current.errors.entityStore).toContain('Entity store install failed');
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

      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockStopEntityStore).not.toHaveBeenCalled();
    });
  });

  describe('concurrent toggle guard', () => {
    it('blocks a second toggle while the first is still in flight', async () => {
      let resolveInstall: () => void;
      mockInstallEntityStore.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveInstall = resolve;
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

      expect(mockInstallEntityStore).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveInstall!();
        await firstToggle!;
      });
    });
  });

  describe('onSaveSettings failure', () => {
    it('does not install entity store and shows error toast when onSaveSettings rejects', async () => {
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
      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });

  describe('error toast on mutation failure', () => {
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
  });

  describe('isStatusLoading guard', () => {
    it('exposes isStatusLoading=true when entity store status query is still loading', () => {
      mockEntityStoreStatusReturn = { data: undefined, isLoading: true };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      expect(result.current.isStatusLoading).toBe(true);
    });

    it('exposes isStatusLoading=false once the status query has data', () => {
      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      expect(result.current.isStatusLoading).toBe(false);
    });

    it('does not call any mutation when toggled while status queries are still loading', async () => {
      mockEntityStoreStatusReturn = { data: undefined, isLoading: true };

      const { result } = renderHook(() => useToggleEntityAnalytics(defaultOptions));

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockInstallEntityStore).not.toHaveBeenCalled();
      expect(mockStartEntityStore).not.toHaveBeenCalled();
      expect(mockStopEntityStore).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });
});
