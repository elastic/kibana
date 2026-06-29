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

const VALID_ALERT_RETRIEVAL_MODES = new Set(['custom_query', 'esql']);

/**
 * Validate that the workflow configuration has the correct composite structure
 * (three independent retrieval toggles plus their sub-fields).
 */
const isValidWorkflowConfiguration = (value: unknown): value is WorkflowConfiguration => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Partial<WorkflowConfiguration>;

  return (
    typeof config.skillEnabled === 'boolean' &&
    typeof config.defaultRetrievalEnabled === 'boolean' &&
    typeof config.alertRetrievalWorkflowsEnabled === 'boolean' &&
    typeof config.alertRetrievalMode === 'string' &&
    VALID_ALERT_RETRIEVAL_MODES.has(config.alertRetrievalMode) &&
    Array.isArray(config.alertRetrievalWorkflowIds) &&
    config.alertRetrievalWorkflowIds.every((id) => typeof id === 'string') &&
    typeof config.validationWorkflowId === 'string' &&
    (config.esqlQuery === undefined || typeof config.esqlQuery === 'string')
  );
};

/**
 * Migrates a legacy single-enum workflow configuration (pre-composite shape,
 * identified by the absence of the `skillEnabled` boolean) to the composite
 * three-toggle shape.
 *
 * Per the migration policy, the retrieval toggles reset to their defaults
 * (skill ON, default-retrieval OFF, workflows OFF) rather than attempting to
 * infer toggle state from the dropped enum; the validation workflow, any
 * selected alert retrieval workflow IDs, and any saved ES|QL query are preserved.
 *
 * Migration is gated on the legacy `alertRetrievalMode` string being present so
 * that genuinely corrupt/unrelated objects still fail validation (and fall back
 * to defaults with a warning) rather than being silently coerced.
 */
const migrateLegacyConfiguration = (parsed: Record<string, unknown>): Record<string, unknown> => {
  const isAlreadyComposite = typeof parsed.skillEnabled === 'boolean';
  const isLegacyShape = typeof parsed.alertRetrievalMode === 'string';

  if (isAlreadyComposite || !isLegacyShape) {
    return parsed;
  }

  const preservedWorkflowIds =
    Array.isArray(parsed.alertRetrievalWorkflowIds) &&
    parsed.alertRetrievalWorkflowIds.every((id) => typeof id === 'string')
      ? (parsed.alertRetrievalWorkflowIds as string[])
      : DEFAULT_WORKFLOW_CONFIGURATION.alertRetrievalWorkflowIds;

  return {
    ...DEFAULT_WORKFLOW_CONFIGURATION,
    alertRetrievalWorkflowIds: preservedWorkflowIds,
    ...(typeof parsed.esqlQuery === 'string' ? { esqlQuery: parsed.esqlQuery } : {}),
    ...(typeof parsed.validationWorkflowId === 'string'
      ? { validationWorkflowId: parsed.validationWorkflowId }
      : {}),
  };
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

    // Migrate the legacy single-enum shape to the composite three-toggle shape
    const migrated = migrateLegacyConfiguration(parsed);

    if (!isValidWorkflowConfiguration(migrated)) {
      // eslint-disable-next-line no-console
      console.warn('Invalid workflow configuration in local storage, using defaults');
      return DEFAULT_WORKFLOW_CONFIGURATION;
    }

    return migrated;
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
