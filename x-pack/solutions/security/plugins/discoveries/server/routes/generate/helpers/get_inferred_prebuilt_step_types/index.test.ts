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
  default_alert_retrieval_mode: 'custom_query',
  validation_workflow_id: '',
};

describe('getInferredPrebuiltStepTypes', () => {
  it('always includes the generate step type', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        default_alert_retrieval_mode: 'disabled',
        validation_workflow_id: 'custom-validation',
      },
    });

    expect(result).toContain('attack-discovery.generate');
  });

  it('includes alert retrieval step type when default_alert_retrieval_mode is not disabled', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: baseWorkflowConfig,
    });

    expect(result).toContain('attack-discovery.defaultAlertRetrieval');
  });

  it('excludes alert retrieval step type when default_alert_retrieval_mode is disabled', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        default_alert_retrieval_mode: 'disabled',
      },
    });

    expect(result).not.toContain('attack-discovery.defaultAlertRetrieval');
  });

  it('includes validation and persist step types when validation_workflow_id is empty string', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: '',
      },
    });

    expect(result).toContain('attack-discovery.defaultValidation');
    expect(result).toContain('attack-discovery.persistDiscoveries');
  });

  it('includes validation and persist step types when validation_workflow_id matches default', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: DEFAULT_VALIDATION_WORKFLOW_ID,
      },
    });

    expect(result).toContain('attack-discovery.defaultValidation');
    expect(result).toContain('attack-discovery.persistDiscoveries');
  });

  it('excludes validation and persist step types when using a custom validation workflow', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        validation_workflow_id: 'custom-validation-workflow-id',
      },
    });

    expect(result).not.toContain('attack-discovery.defaultValidation');
    expect(result).not.toContain('attack-discovery.persistDiscoveries');
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
      'attack-discovery.defaultAlertRetrieval',
      'attack-discovery.defaultValidation',
      'attack-discovery.generate',
      'attack-discovery.persistDiscoveries',
    ]);
  });

  it('returns only the generate step type when all optional features are disabled or custom', () => {
    const result = getInferredPrebuiltStepTypes({
      defaultValidationWorkflowId: DEFAULT_VALIDATION_WORKFLOW_ID,
      workflowConfig: {
        ...baseWorkflowConfig,
        default_alert_retrieval_mode: 'disabled',
        validation_workflow_id: 'custom-validation',
      },
    });

    expect(result).toEqual(['attack-discovery.generate']);
  });
});
