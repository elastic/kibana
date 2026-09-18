/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfig } from '@kbn/discoveries-schemas';

import { workflowConfigApiToForm } from '.';

describe('workflowConfigApiToForm', () => {
  it('maps every composite field from snake_case API to camelCase form', () => {
    const apiConfig: WorkflowConfig = {
      alert_retrieval_mode: 'esql',
      alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
      alert_retrieval_workflows_enabled: true,
      default_retrieval_enabled: true,
      esql_query: 'FROM .alerts-security.alerts-default',
      skill_enabled: false,
      validation_workflow_id: 'custom-validate',
    };

    expect(workflowConfigApiToForm(apiConfig)).toEqual({
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM .alerts-security.alerts-default',
      skillEnabled: false,
      validationWorkflowId: 'custom-validate',
    });
  });

  it('omits esqlQuery when esql_query is undefined', () => {
    const apiConfig: WorkflowConfig = {
      alert_retrieval_mode: 'custom_query',
      alert_retrieval_workflow_ids: [],
      alert_retrieval_workflows_enabled: false,
      default_retrieval_enabled: false,
      skill_enabled: true,
      validation_workflow_id: 'default',
    };

    expect(workflowConfigApiToForm(apiConfig)).not.toHaveProperty('esqlQuery');
  });
});
