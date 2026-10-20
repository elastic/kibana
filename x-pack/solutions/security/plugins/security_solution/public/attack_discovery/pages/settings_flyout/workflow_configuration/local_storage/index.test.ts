/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_WORKFLOW_CONFIGURATION } from '../constants';
import {
  clearWorkflowSettings,
  getWorkflowConfigStorageKey,
  getWorkflowSettings,
  setWorkflowSettings,
} from '.';
import type { WorkflowConfiguration } from '../types';

describe('workflow configuration local storage', () => {
  const testSpaceId = 'test-space';
  const testConfig: WorkflowConfiguration = {
    alertRetrievalMode: 'esql',
    alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
    alertRetrievalWorkflowsEnabled: true,
    defaultRetrievalEnabled: true,
    skillEnabled: false,
    validationWorkflowId: 'custom-validation',
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getWorkflowConfigStorageKey', () => {
    it('returns the correct storage key for a space', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);

      expect(key).toBe('elasticAssistantDefault.attackDiscovery.workflowConfig.test-space');
    });
  });

  describe('getWorkflowSettings', () => {
    it('returns default configuration when no settings are stored', () => {
      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
    });

    it('defaults alertRetrievalMode to esql when no settings are stored', () => {
      const result = getWorkflowSettings(testSpaceId);

      expect(result.alertRetrievalMode).toBe('esql');
    });

    it('returns stored configuration when valid settings exist', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      localStorage.setItem(key, JSON.stringify(testConfig));

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(testConfig);
    });

    it('returns default configuration when stored data is invalid JSON', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      localStorage.setItem(key, 'invalid-json{');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading workflow settings from local storage:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('returns default configuration when stored data has invalid structure', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      localStorage.setItem(key, JSON.stringify({ invalid: 'structure' }));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid workflow configuration in local storage, using defaults'
      );

      consoleWarnSpy.mockRestore();
    });

    it('returns default configuration when stored data has invalid alertRetrievalWorkflowIds', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const invalidConfig = {
        alertRetrievalMode: 'custom_query',
        alertRetrievalWorkflowIds: 'not-an-array',
        alertRetrievalWorkflowsEnabled: false,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(invalidConfig));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);

      consoleWarnSpy.mockRestore();
    });

    it('returns default configuration when a composite config has an invalid alertRetrievalMode', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const invalidConfig = {
        alertRetrievalMode: 'invalid_mode',
        alertRetrievalWorkflowIds: [],
        alertRetrievalWorkflowsEnabled: false,
        defaultRetrievalEnabled: false,
        skillEnabled: true,
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(invalidConfig));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);

      consoleWarnSpy.mockRestore();
    });

    it('accepts a composite configuration with esqlQuery', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const configWithEsql: WorkflowConfiguration = {
        alertRetrievalMode: 'esql',
        alertRetrievalWorkflowIds: [],
        alertRetrievalWorkflowsEnabled: false,
        defaultRetrievalEnabled: true,
        esqlQuery: 'FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == "high"',
        skillEnabled: false,
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(configWithEsql));

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(configWithEsql);
    });

    describe('legacy single-enum migration', () => {
      it('resets retrieval toggles to defaults for a legacy skill config', () => {
        const key = getWorkflowConfigStorageKey(testSpaceId);
        const legacyConfig = {
          alertRetrievalMode: 'skill',
          alertRetrievalWorkflowIds: [],
          validationWorkflowId: 'default',
        };
        localStorage.setItem(key, JSON.stringify(legacyConfig));

        const result = getWorkflowSettings(testSpaceId);

        expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);
      });

      it('preserves validationWorkflowId and alertRetrievalWorkflowIds from a legacy config', () => {
        const key = getWorkflowConfigStorageKey(testSpaceId);
        const legacyConfig = {
          alertRetrievalMode: 'custom_only',
          alertRetrievalWorkflowIds: ['workflow-1'],
          validationWorkflowId: 'custom',
        };
        localStorage.setItem(key, JSON.stringify(legacyConfig));

        const result = getWorkflowSettings(testSpaceId);

        expect(result).toEqual({
          ...DEFAULT_WORKFLOW_CONFIGURATION,
          alertRetrievalWorkflowIds: ['workflow-1'],
          validationWorkflowId: 'custom',
        });
      });

      it('preserves a saved esqlQuery from a legacy esql config', () => {
        const key = getWorkflowConfigStorageKey(testSpaceId);
        const legacyConfig = {
          alertRetrievalMode: 'esql',
          alertRetrievalWorkflowIds: [],
          esqlQuery: 'FROM .alerts-security.alerts-default',
          validationWorkflowId: 'default',
        };
        localStorage.setItem(key, JSON.stringify(legacyConfig));

        const result = getWorkflowSettings(testSpaceId);

        expect(result).toEqual({
          ...DEFAULT_WORKFLOW_CONFIGURATION,
          esqlQuery: 'FROM .alerts-security.alerts-default',
        });
      });

      it('migrates a legacy promotionWorkflowId to validationWorkflowId', () => {
        const key = getWorkflowConfigStorageKey(testSpaceId);
        const legacyConfig = {
          alertRetrievalMode: 'skill',
          alertRetrievalWorkflowIds: [],
          promotionWorkflowId: 'legacy-validation',
        };
        localStorage.setItem(key, JSON.stringify(legacyConfig));

        const result = getWorkflowSettings(testSpaceId);

        expect(result.validationWorkflowId).toBe('legacy-validation');
      });
    });
  });

  describe('setWorkflowSettings', () => {
    it('saves settings to local storage', () => {
      const success = setWorkflowSettings(testSpaceId, testConfig);

      expect(success).toBe(true);

      const key = getWorkflowConfigStorageKey(testSpaceId);
      const stored = localStorage.getItem(key);

      expect(stored).toBe(JSON.stringify(testConfig));
    });

    it('returns false when storage quota is exceeded', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      setItemSpy.mockImplementation(() => {
        throw quotaError;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const success = setWorkflowSettings(testSpaceId, testConfig);

      expect(success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Local storage quota exceeded when saving workflow settings'
      );

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('returns false on other storage errors', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const error = new Error('Storage error');
      setItemSpy.mockImplementation(() => {
        throw error;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const success = setWorkflowSettings(testSpaceId, testConfig);

      expect(success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving workflow settings to local storage:',
        error
      );

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearWorkflowSettings', () => {
    it('removes settings from local storage', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      localStorage.setItem(key, JSON.stringify(testConfig));

      clearWorkflowSettings(testSpaceId);

      expect(localStorage.getItem(key)).toBeNull();
    });

    it('handles errors gracefully', () => {
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      const error = new Error('Storage error');
      removeItemSpy.mockImplementation(() => {
        throw error;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      clearWorkflowSettings(testSpaceId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing workflow settings from local storage:',
        error
      );

      removeItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
