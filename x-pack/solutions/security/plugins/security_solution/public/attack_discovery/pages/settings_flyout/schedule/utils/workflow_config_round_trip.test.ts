/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfiguration } from '../../workflow_configuration/types';

import { workflowConfigApiToForm } from './workflow_config_api_to_form';
import { workflowConfigFormToApi } from './workflow_config_form_to_api';

/**
 * CRUD3 — inverse round-trip integrity (TDD).
 *
 * `apiToForm(formToApi(config))` MUST deep-equal `config` over a matrix of
 * NON-default values for every composite field. Non-default values are
 * mandatory so a dropped field cannot coincide with its default value and
 * silently pass.
 */
describe('workflowConfig form <-> api inverse round-trip (non-default values)', () => {
  const nonDefaultConfigs: Record<string, WorkflowConfiguration> = {
    'skill OFF, default-retrieval ON in esql mode, workflows ON with ids': {
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
      skillEnabled: false,
      validationWorkflowId: 'custom-validate',
    },
    'default-retrieval ON in query-builder mode': {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: [],
      alertRetrievalWorkflowsEnabled: false,
      defaultRetrievalEnabled: true,
      skillEnabled: false,
      validationWorkflowId: 'custom-validate',
    },
    'workflows ON only, with non-empty ids': {
      alertRetrievalMode: 'custom_query',
      alertRetrievalWorkflowIds: ['only-this-workflow'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: false,
      skillEnabled: false,
      validationWorkflowId: 'another-non-default-validation',
    },
    'skill ON with non-default validation workflow id': {
      alertRetrievalMode: 'esql',
      alertRetrievalWorkflowIds: ['wf-a', 'wf-b', 'wf-c'],
      alertRetrievalWorkflowsEnabled: true,
      defaultRetrievalEnabled: true,
      esqlQuery: 'FROM logs-* | WHERE event.kind == "alert"',
      skillEnabled: true,
      validationWorkflowId: 'team-specific-validation',
    },
  };

  it.each(Object.entries(nonDefaultConfigs))('round-trips losslessly: %s', (_label, config) => {
    expect(workflowConfigApiToForm(workflowConfigFormToApi(config))).toEqual(config);
  });
});
