/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferredPrebuiltStepTypes } from '.';
import type { WorkflowConfig } from '@kbn/discoveries/impl/attack_discovery/generation/types';

const DEFAULT_VALIDATION_WORKFLOW_ID = 'default-validation-workflow-id';

const baseWorkflowConfig: WorkflowConfig = {
  alert_retrieval_workflow_ids: ['alert-retrieval-1'],
  alert_retrieval_mode: 'custom_query',
  validation_workflow_id: '',
};

describe('getInferredPrebuiltStepTypes', () => {
  it('always includes the generate step type', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        alert_retrieval_mode: 'custom_only',
        validation_workflow_id: 'custom-validation',
      },
    });

    expect(result).toContain('security.attack-discovery.generate');
  });

  it('includes alert retrieval step type when alert_retrieval_mode is not custom_only', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: baseWorkflowConfig,
    });

    expect(result).toContain('security.attack-discovery.defaultAlertRetrieval');
  });

  it('excludes alert retrieval step type when alert_retrieval_mode is custom_only', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        alert_retrieval_mode: 'custom_only',
      },
    });

    expect(result).not.toContain('security.attack-discovery.defaultAlertRetrieval');
  });

  it('includes validation and persist step types when validation_workflow_id is empty string', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: '',
      },
    });

    expect(result).toContain('security.attack-discovery.defaultValidation');
    expect(result).toContain('security.attack-discovery.persistDiscoveries');
  });

  it('includes validation and persist step types when validation_workflow_id matches default', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: DEFAULT_VALIDATION_WORKFLOW_ID,
      },
    });

    expect(result).toContain('security.attack-discovery.defaultValidation');
    expect(result).toContain('security.attack-discovery.persistDiscoveries');
  });

  it('excludes validation and persist step types when using a custom validation workflow', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: 'custom-validation-workflow-id',
      },
    });

    expect(result).not.toContain('security.attack-discovery.defaultValidation');
    expect(result).not.toContain('security.attack-discovery.persistDiscoveries');
  });

  it('returns step types in sorted order', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: baseWorkflowConfig,
    });

    const sorted = [...result].sort();

    expect(result).toEqual(sorted);
  });

  it('returns all four prebuilt step types when using default alert retrieval and default validation', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: baseWorkflowConfig,
    });

    expect(result).toEqual([
      'security.attack-discovery.defaultAlertRetrieval',
      'security.attack-discovery.defaultValidation',
      'security.attack-discovery.generate',
      'security.attack-discovery.persistDiscoveries',
    ]);
  });

  it('returns only the generate step type when all optional features are custom_only or custom', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        alert_retrieval_mode: 'custom_only',
        validation_workflow_id: 'custom-validation',
      },
    });

    expect(result).toEqual(['security.attack-discovery.generate']);
  });
});
