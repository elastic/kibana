/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_STORAGE_KEY, DEFAULT_ASSISTANT_NAMESPACE } from '@kbn/elastic-assistant';
import { DEFAULT_WORKFLOW_CONFIGURATION, WORKFLOW_CONFIG_LOCAL_STORAGE_KEY } from '../constants';
import type { WorkflowConfiguration } from '../types';

/**
 * Build the local storage key for workflow configuration scoped to a space
 */
export const getWorkflowConfigStorageKey = (spaceId: string): string => {
  return `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${WORKFLOW_CONFIG_LOCAL_STORAGE_KEY}.${spaceId}`;
};

const VALID_ALERT_RETRIEVAL_MODES = new Set(['custom_query', 'disabled', 'esql']);

/**
 * Validate that the workflow configuration has the correct structure
 */
const isValidWorkflowConfiguration = (value: unknown): value is WorkflowConfiguration => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Partial<WorkflowConfiguration>;

  return (
    typeof config.defaultAlertRetrievalMode === 'string' &&
    VALID_ALERT_RETRIEVAL_MODES.has(config.defaultAlertRetrievalMode) &&
    Array.isArray(config.alertRetrievalWorkflowIds) &&
    config.alertRetrievalWorkflowIds.every((id) => typeof id === 'string') &&
    typeof config.validationWorkflowId === 'string' &&
    (config.esqlQuery === undefined || typeof config.esqlQuery === 'string')
  );
};

/**
 * Retrieve workflow settings from local storage for a specific space
 */
export const getWorkflowSettings = (spaceId: string): WorkflowConfiguration => {
  try {
    const key = getWorkflowConfigStorageKey(spaceId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return DEFAULT_WORKFLOW_CONFIGURATION;
    }

    const parsed = JSON.parse(stored) as Record<string, unknown>;

    // Migrate legacy promotionWorkflowId to validationWorkflowId
    if (
      typeof parsed?.promotionWorkflowId === 'string' &&
      typeof parsed?.validationWorkflowId !== 'string'
    ) {
      parsed.validationWorkflowId = parsed.promotionWorkflowId;
      delete parsed.promotionWorkflowId;
    }

    // Migrate legacyAlertRetrievalEnabled to defaultAlertRetrievalMode
    if (
      typeof parsed?.legacyAlertRetrievalEnabled === 'boolean' &&
      typeof parsed?.defaultAlertRetrievalMode !== 'string'
    ) {
      parsed.defaultAlertRetrievalMode = parsed.legacyAlertRetrievalEnabled
        ? 'custom_query'
        : 'disabled';
      delete parsed.legacyAlertRetrievalEnabled;
    }

    // Migrate defaultAlertRetrievalEnabled boolean to defaultAlertRetrievalMode enum
    if (
      typeof parsed?.defaultAlertRetrievalEnabled === 'boolean' &&
      typeof parsed?.defaultAlertRetrievalMode !== 'string'
    ) {
      parsed.defaultAlertRetrievalMode = parsed.defaultAlertRetrievalEnabled
        ? 'custom_query'
        : 'disabled';
      delete parsed.defaultAlertRetrievalEnabled;
    }

    if (!isValidWorkflowConfiguration(parsed)) {
      // eslint-disable-next-line no-console
      console.warn('Invalid workflow configuration in local storage, using defaults');
      return DEFAULT_WORKFLOW_CONFIGURATION;
    }

    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading workflow settings from local storage:', error);
    return DEFAULT_WORKFLOW_CONFIGURATION;
  }
};

/**
 * Save workflow settings to local storage for a specific space
 */
export const setWorkflowSettings = (spaceId: string, settings: WorkflowConfiguration): boolean => {
  try {
    const key = getWorkflowConfigStorageKey(spaceId);
    const serialized = JSON.stringify(settings);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // eslint-disable-next-line no-console
      console.error('Local storage quota exceeded when saving workflow settings');
    } else {
      // eslint-disable-next-line no-console
      console.error('Error saving workflow settings to local storage:', error);
    }
    return false;
  }
};

/**
 * Clear workflow settings from local storage for a specific space
 */
export const clearWorkflowSettings = (spaceId: string): void => {
  try {
    const key = getWorkflowConfigStorageKey(spaceId);
    localStorage.removeItem(key);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing workflow settings from local storage:', error);
  }
};
