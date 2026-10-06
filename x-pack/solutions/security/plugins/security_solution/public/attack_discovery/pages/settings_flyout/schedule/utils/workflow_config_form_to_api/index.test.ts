/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfiguration } from '../../../workflow_configuration/types';

import { workflowConfigFormToApi } from '.';

describe('workflowConfigFormToApi', () => {
  it('maps every composite field from camelCase form to snake_case API', () => {
    const config: WorkflowConfiguration = {
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM .alerts-security.alerts-default',
      skillEnabled: false,
      validationWorkflowId: 'custom-validate',
    };

    expect(workflowConfigFormToApi(config)).toEqual({
      alert_retrieval_mode: 'esql',
      alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
      alert_retrieval_workflows_enabled: true,
      default_retrieval_enabled: true,
      esql_query: 'FROM .alerts-security.alerts-default',
      skill_enabled: false,
      validation_workflow_id: 'custom-validate',
    });
  });

  it('omits esql_query when esqlQuery is undefined', () => {
    const config: WorkflowConfiguration = {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: [],
      alertRetrievalWorkflowsEnabled: false,
      defaultRetrievalEnabled: false,
      skillEnabled: true,
      validationWorkflowId: 'default',
    };

    expect(workflowConfigFormToApi(config)).not.toHaveProperty('esql_query');
  });
});
