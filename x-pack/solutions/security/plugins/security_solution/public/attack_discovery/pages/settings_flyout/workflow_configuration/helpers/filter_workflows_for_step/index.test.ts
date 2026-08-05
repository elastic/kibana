/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  SYSTEM_VALIDATE_WORKFLOW_ID,
} from '../../constants';
import type { WorkflowItem } from '../../types';
import { filterWorkflowsForAlertRetrieval, filterWorkflowsForValidation } from '.';

const defaultAlertRetrieval: WorkflowItem = {
  description: 'Default alert retrieval',
  id: 'system-attack-discovery-alert-retrieval',
  managed: true,
  name: 'Attack discovery - Default alert retrieval',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:default_alert_retrieval'],
};

const generation: WorkflowItem = {
  description: 'Generation workflow',
  id: 'system-attack-discovery-generation',
  managed: true,
  name: 'Attack discovery - Generation',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:generation'],
};

const defaultValidation: WorkflowItem = {
  description: 'Default validation',
  id: SYSTEM_VALIDATE_WORKFLOW_ID,
  managed: true,
  name: 'Attack discovery - Default validation',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:validate'],
};

const customValidationExample: WorkflowItem = {
  description: 'Custom validation example',
  id: SYSTEM_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  managed: true,
  name: 'Attack discovery - Custom validation example',
  tags: ['Attack discovery', 'Security', 'Example', 'attackDiscovery:custom_validation_example'],
};

// A managed (system) workflow owned by another plugin. It carries no
// `attackDiscovery:*` tag, which is exactly why the previous tag-based filter
// allowed it to leak into both dropdowns.
const streamsKiOnboarding: WorkflowItem = {
  description: 'Orchestrates KI feature identification',
  id: 'system-streams-ki-onboarding',
  managed: true,
  name: '.streams-ki-onboarding',
  tags: ['Streams'],
};

const customWorkflow: WorkflowItem = {
  description: 'A user-created custom workflow',
  id: 'custom-workflow-id',
  managed: false,
  name: 'My Custom Workflow',
  tags: ['custom-tag'],
};

const workflowWithNoTags: WorkflowItem = {
  description: 'A workflow without tags',
  id: 'no-tags-id',
  name: 'No Tags Workflow',
};

const allWorkflows: WorkflowItem[] = [
  customValidationExample,
  customWorkflow,
  defaultAlertRetrieval,
  defaultValidation,
  generation,
  streamsKiOnboarding,
  workflowWithNoTags,
];

describe('filterWorkflowsForAlertRetrieval', () => {
  it('excludes the default alert retrieval workflow', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === defaultAlertRetrieval.id)).toBeUndefined();
  });

  it('excludes the generation workflow', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === generation.id)).toBeUndefined();
  });

  it('excludes the default validation workflow', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === defaultValidation.id)).toBeUndefined();
  });

  it('excludes the custom validation example workflow', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === customValidationExample.id)).toBeUndefined();
  });

  it('excludes managed workflows owned by other plugins', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === streamsKiOnboarding.id)).toBeUndefined();
  });

  it('includes custom (user-created) workflows', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === customWorkflow.id)).toBeDefined();
  });

  it('includes workflows without an explicit managed flag', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === workflowWithNoTags.id)).toBeDefined();
  });

  it('returns an empty array when given an empty array', () => {
    expect(filterWorkflowsForAlertRetrieval([])).toEqual([]);
  });
});

describe('filterWorkflowsForValidation', () => {
  it('excludes the default alert retrieval workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === defaultAlertRetrieval.id)).toBeUndefined();
  });

  it('excludes the generation workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === generation.id)).toBeUndefined();
  });

  it('excludes managed workflows owned by other plugins', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === streamsKiOnboarding.id)).toBeUndefined();
  });

  it('includes the default validation workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === defaultValidation.id)).toBeDefined();
  });

  it('includes the custom validation example workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === customValidationExample.id)).toBeDefined();
  });

  it('includes custom (user-created) workflows', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === customWorkflow.id)).toBeDefined();
  });

  it('includes workflows without an explicit managed flag', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === workflowWithNoTags.id)).toBeDefined();
  });

  it('returns an empty array when given an empty array', () => {
    expect(filterWorkflowsForValidation([])).toEqual([]);
  });
});
