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
    alertRetrievalWorkflowIds: ['workflow-1', 'workflow-2'],
    defaultAlertRetrievalMode: 'disabled',
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
        alertRetrievalWorkflowIds: 'not-an-array',
        defaultAlertRetrievalMode: 'custom_query',
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(invalidConfig));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);

      consoleWarnSpy.mockRestore();
    });

    it('returns default configuration when stored data has invalid defaultAlertRetrievalMode', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const invalidConfig = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalMode: 'invalid_mode',
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(invalidConfig));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(DEFAULT_WORKFLOW_CONFIGURATION);

      consoleWarnSpy.mockRestore();
    });

    it('accepts configuration with esqlQuery', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const configWithEsql: WorkflowConfiguration = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalMode: 'esql',
        esqlQuery: 'FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == "high"',
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(configWithEsql));

      const result = getWorkflowSettings(testSpaceId);

      expect(result).toEqual(configWithEsql);
    });

    it('migrates legacy defaultAlertRetrievalEnabled true to custom_query', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const legacyConfig = {
        alertRetrievalWorkflowIds: [],
        defaultAlertRetrievalEnabled: true,
        validationWorkflowId: 'default',
      };
      localStorage.setItem(key, JSON.stringify(legacyConfig));

      const result = getWorkflowSettings(testSpaceId);

      expect(result.defaultAlertRetrievalMode).toBe('custom_query');
    });

    it('migrates legacy defaultAlertRetrievalEnabled false to disabled', () => {
      const key = getWorkflowConfigStorageKey(testSpaceId);
      const legacyConfig = {
        alertRetrievalWorkflowIds: ['workflow-1'],
        defaultAlertRetrievalEnabled: false,
        validationWorkflowId: 'custom',
      };
      localStorage.setItem(key, JSON.stringify(legacyConfig));

      const result = getWorkflowSettings(testSpaceId);

      expect(result.defaultAlertRetrievalMode).toBe('disabled');
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
