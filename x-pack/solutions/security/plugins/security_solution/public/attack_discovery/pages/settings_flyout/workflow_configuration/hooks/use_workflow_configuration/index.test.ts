/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DEFAULT_WORKFLOW_CONFIGURATION } from '../../constants';
import { getWorkflowSettings, setWorkflowSettings } from '../../local_storage';
import type { WorkflowConfiguration } from '../../types';
import { useWorkflowConfiguration } from '.';

jest.mock('../../../../../../common/hooks/use_space_id');
jest.mock('../../local_storage');

const mockUseSpaceId = useSpaceId as jest.Mock;
const mockGetWorkflowSettings = getWorkflowSettings as jest.Mock;
const mockSetWorkflowSettings = setWorkflowSettings as jest.Mock;

describe('useWorkflowConfiguration', () => {
  const testSpaceId = 'test-space';
  const testConfig: WorkflowConfiguration = {
    alertRetrievalWorkflowIds: ['workflow-1'],
    defaultAlertRetrievalMode: 'disabled',
    validationWorkflowId: 'custom',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkflowSettings.mockReturnValue(DEFAULT_WORKFLOW_CONFIGURATION);
    mockSetWorkflowSettings.mockReturnValue(true);
  });

  describe('initial load', () => {
    describe('when space ID is not available', () => {
      let result: ReturnType<
        typeof renderHook<ReturnType<typeof useWorkflowConfiguration>, unknown>
      >;

      beforeEach(() => {
        mockUseSpaceId.mockReturnValue(undefined);
        result = renderHook(() => useWorkflowConfiguration());
      });

      it('returns loading state', () => {
        expect(result.result.current.isLoading).toBe(true);
      });

      it('returns default workflow configuration', () => {
        expect(result.result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      });
    });

    describe('when space ID becomes available', () => {
      let result: ReturnType<
        typeof renderHook<ReturnType<typeof useWorkflowConfiguration>, unknown>
      >;

      beforeEach(async () => {
        mockUseSpaceId.mockReturnValue(testSpaceId);
        mockGetWorkflowSettings.mockReturnValue(testConfig);

        result = renderHook(() => useWorkflowConfiguration());

        await waitFor(() => {
          expect(result.result.current.isLoading).toBe(false);
        });
      });

      it('calls getWorkflowSettings with space ID', () => {
        expect(mockGetWorkflowSettings).toHaveBeenCalledWith(testSpaceId);
      });

      it('loads settings from local storage', () => {
        expect(result.result.current.workflowConfiguration).toEqual(testConfig);
      });
    });

    it('uses default configuration when no settings are stored', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(DEFAULT_WORKFLOW_CONFIGURATION);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
    });
  });

  describe('updateSettings', () => {
    describe('on success', () => {
      let result: ReturnType<
        typeof renderHook<ReturnType<typeof useWorkflowConfiguration>, unknown>
      >;
      let success: boolean;

      beforeEach(async () => {
        mockUseSpaceId.mockReturnValue(testSpaceId);
        mockSetWorkflowSettings.mockReturnValue(true);

        result = renderHook(() => useWorkflowConfiguration());

        await waitFor(() => {
          expect(result.result.current.isLoading).toBe(false);
        });

        act(() => {
          success = result.result.current.updateSettings(testConfig);
        });
      });

      it('returns true', () => {
        expect(success).toBe(true);
      });

      it('calls setWorkflowSettings with space ID and config', () => {
        expect(mockSetWorkflowSettings).toHaveBeenCalledWith(testSpaceId, testConfig);
      });

      it('updates workflow configuration', () => {
        expect(result.result.current.workflowConfiguration).toEqual(testConfig);
      });
    });

    it('returns false when space ID is not available', async () => {
      mockUseSpaceId.mockReturnValue(undefined);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useWorkflowConfiguration());

      const success = result.current.updateSettings(testConfig);

      expect(success).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot update workflow settings: space ID not available'
      );
      expect(mockSetWorkflowSettings).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('returns false when storage operation fails', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockSetWorkflowSettings.mockReturnValue(false);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const success = result.current.updateSettings(testConfig);

      expect(success).toBe(false);
      expect(mockSetWorkflowSettings).toHaveBeenCalledWith(testSpaceId, testConfig);
      expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
    });
  });

  describe('clearSettings', () => {
    it('resets settings to defaults', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(testConfig);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.workflowConfiguration).toEqual(testConfig);
      });

      act(() => {
        result.current.clearSettings();
      });

      expect(mockSetWorkflowSettings).toHaveBeenCalledWith(
        testSpaceId,
        DEFAULT_WORKFLOW_CONFIGURATION
      );
      expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
    });

    it('warns when space ID is not available', async () => {
      mockUseSpaceId.mockReturnValue(undefined);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useWorkflowConfiguration());

      result.current.clearSettings();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot clear workflow settings: space ID not available'
      );
      expect(mockSetWorkflowSettings).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('storage event synchronization', () => {
    it('updates state when storage event is received for the same space', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(DEFAULT_WORKFLOW_CONFIGURATION);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const storageEvent = new StorageEvent('storage', {
        key: 'elasticAssistantDefault.attackDiscovery.workflowConfig.test-space',
        newValue: JSON.stringify(testConfig),
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      await waitFor(() => {
        expect(result.current.workflowConfiguration).toEqual(testConfig);
      });
    });

    it('resets to defaults when storage is cleared', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(testConfig);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.workflowConfiguration).toEqual(testConfig);
      });

      const storageEvent = new StorageEvent('storage', {
        key: 'elasticAssistantDefault.attackDiscovery.workflowConfig.test-space',
        newValue: null,
      });

      act(() => {
        window.dispatchEvent(storageEvent);
      });

      await waitFor(() => {
        expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      });
    });

    it('ignores storage events for different keys', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(DEFAULT_WORKFLOW_CONFIGURATION);

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const storageEvent = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: JSON.stringify(testConfig),
      });

      window.dispatchEvent(storageEvent);

      await waitFor(() => {
        expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      });
    });

    it('handles invalid JSON in storage events gracefully', async () => {
      mockUseSpaceId.mockReturnValue(testSpaceId);
      mockGetWorkflowSettings.mockReturnValue(DEFAULT_WORKFLOW_CONFIGURATION);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useWorkflowConfiguration());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const storageEvent = new StorageEvent('storage', {
        key: 'elasticAssistantDefault.attackDiscovery.workflowConfig.test-space',
        newValue: 'invalid-json{',
      });

      window.dispatchEvent(storageEvent);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing workflow configuration from storage event:',
        expect.any(Error)
      );

      expect(result.current.workflowConfiguration).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);

      consoleErrorSpy.mockRestore();
    });
  });
});
