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
