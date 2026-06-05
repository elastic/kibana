/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfiguration } from './types';

/**
 * Local storage key for workflow configuration
 */
export const WORKFLOW_CONFIG_LOCAL_STORAGE_KEY = 'workflowConfig';

/**
 * Default workflow settings when feature flag is first enabled
 */
export const DEFAULT_WORKFLOW_CONFIGURATION: WorkflowConfiguration = {
  alertRetrievalMode: 'custom_query',
  alertRetrievalWorkflowIds: [],
  validationWorkflowId: 'default',
};

/**
 * The well-known ID of the system-managed default validation workflow.
 */
export const SYSTEM_VALIDATE_WORKFLOW_ID = 'system-attack-discovery-validate';

/**
 * The well-known ID of the system-managed custom validation example workflow.
 */
export const SYSTEM_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID =
  'system-attack-discovery-custom-validation-example';

/**
 * Managed (system) workflows are hidden from the settings dropdowns, EXCEPT the
 * validation workflows in this allowlist, which must remain selectable in the
 * Validation step.
 */
export const VALIDATION_ALLOWLIST_WORKFLOW_IDS: ReadonlySet<string> = new Set([
  SYSTEM_VALIDATE_WORKFLOW_ID,
  SYSTEM_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
]);
