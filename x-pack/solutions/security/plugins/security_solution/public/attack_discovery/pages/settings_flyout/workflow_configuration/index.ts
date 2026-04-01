/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 6
import type { WorkflowConfiguration } from './types';

export type { WorkflowConfiguration } from './types';

const DEFAULT_WORKFLOW_CONFIGURATION: WorkflowConfiguration = {
  alertRetrievalWorkflowIds: [],
  defaultAlertRetrievalMode: 'custom_query',
  validationWorkflowId: 'default',
};

export const getWorkflowSettings = (_spaceId: string): WorkflowConfiguration =>
  DEFAULT_WORKFLOW_CONFIGURATION;

export const setWorkflowSettings = (_spaceId: string, _settings: WorkflowConfiguration): void => {};

export const clearWorkflowSettings = (_spaceId: string): void => {};
