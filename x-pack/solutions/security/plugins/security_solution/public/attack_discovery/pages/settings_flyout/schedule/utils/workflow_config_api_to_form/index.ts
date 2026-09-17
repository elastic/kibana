/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfig } from '@kbn/discoveries-schemas';

import type { WorkflowConfiguration } from '../../../workflow_configuration/types';

/**
 * The single, shared mapper from the snake_case API {@link WorkflowConfig} to
 * the camelCase form {@link WorkflowConfiguration}.
 *
 * Paired with {@link workflowConfigFormToApi}, it guarantees the composite
 * config round-trips losslessly across the API <-> form seam. It performs a
 * straight field-for-field copy with NO per-field masking defaults, so a field
 * dropped upstream surfaces as a test failure instead of being silently
 * repaired to its default value.
 */
export const workflowConfigApiToForm = (workflowConfig: WorkflowConfig): WorkflowConfiguration => ({
  alertRetrievalMode: workflowConfig.alert_retrieval_mode,
  alertRetrievalWorkflowIds: workflowConfig.alert_retrieval_workflow_ids,
  alertRetrievalWorkflowsEnabled: workflowConfig.alert_retrieval_workflows_enabled,
  defaultRetrievalEnabled: workflowConfig.default_retrieval_enabled,
  ...(workflowConfig.esql_query != null ? { esqlQuery: workflowConfig.esql_query } : {}),
  skillEnabled: workflowConfig.skill_enabled,
  validationWorkflowId: workflowConfig.validation_workflow_id,
});
