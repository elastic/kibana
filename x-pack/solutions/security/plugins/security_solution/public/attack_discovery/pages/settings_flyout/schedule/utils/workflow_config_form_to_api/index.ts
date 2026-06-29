/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfig } from '@kbn/discoveries-schemas';

import type { WorkflowConfiguration } from '../../../workflow_configuration/types';

/**
 * The single, shared mapper from the camelCase form {@link WorkflowConfiguration}
 * to the snake_case API {@link WorkflowConfig}.
 *
 * Paired with {@link workflowConfigApiToForm}, it guarantees the composite
 * config round-trips losslessly across the form <-> API seam. Keeping a single
 * mapper (instead of multiple hand-maintained builders) minimizes the number of
 * places a field can be silently dropped.
 */
export const workflowConfigFormToApi = (workflowConfig: WorkflowConfiguration): WorkflowConfig => ({
  alert_retrieval_mode: workflowConfig.alertRetrievalMode,
  alert_retrieval_workflow_ids: workflowConfig.alertRetrievalWorkflowIds,
  alert_retrieval_workflows_enabled: workflowConfig.alertRetrievalWorkflowsEnabled,
  default_retrieval_enabled: workflowConfig.defaultRetrievalEnabled,
  ...(workflowConfig.esqlQuery != null ? { esql_query: workflowConfig.esqlQuery } : {}),
  skill_enabled: workflowConfig.skillEnabled,
  validation_workflow_id: workflowConfig.validationWorkflowId,
});
