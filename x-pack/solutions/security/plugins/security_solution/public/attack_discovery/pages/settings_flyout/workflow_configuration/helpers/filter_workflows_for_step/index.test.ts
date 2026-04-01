/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowItem } from '../../types';
import { filterWorkflowsForAlertRetrieval, filterWorkflowsForValidation } from '.';

const defaultAlertRetrieval: WorkflowItem = {
  description: 'Default alert retrieval',
  id: 'default-alert-retrieval-id',
  name: 'Attack discovery - Default alert retrieval',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:default_alert_retrieval'],
};

const generation: WorkflowItem = {
  description: 'Generation workflow',
  id: 'generation-id',
  name: 'Attack discovery - Generation',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:generation'],
};

const defaultValidation: WorkflowItem = {
  description: 'Default validation',
  id: 'default-validation-id',
  name: 'Attack discovery - Default validation',
  tags: ['Attack discovery', 'Security', 'attackDiscovery:validate'],
};

const esqlExample: WorkflowItem = {
  description: 'ES|QL example alert retrieval',
  id: 'esql-example-id',
  name: 'Attack discovery - ES|QL example alert retrieval',
  tags: ['Attack discovery', 'Security', 'Example', 'attackDiscovery:esql_example_alert_retrieval'],
};

const customWorkflow: WorkflowItem = {
  description: 'A user-created custom workflow',
  id: 'custom-workflow-id',
  name: 'My Custom Workflow',
  tags: ['custom-tag'],
};

const workflowWithNoTags: WorkflowItem = {
  description: 'A workflow without tags',
  id: 'no-tags-id',
  name: 'No Tags Workflow',
};

const allWorkflows: WorkflowItem[] = [
  customWorkflow,
  defaultAlertRetrieval,
  defaultValidation,
  esqlExample,
  generation,
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

  it('includes the ES|QL example alert retrieval workflow', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === esqlExample.id)).toBeDefined();
  });

  it('includes custom (user-created) workflows', () => {
    const result = filterWorkflowsForAlertRetrieval(allWorkflows);

    expect(result.find((w) => w.id === customWorkflow.id)).toBeDefined();
  });

  it('includes workflows without tags', () => {
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

  it('excludes the ES|QL example alert retrieval workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === esqlExample.id)).toBeUndefined();
  });

  it('includes the default validation workflow', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === defaultValidation.id)).toBeDefined();
  });

  it('includes custom (user-created) workflows', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === customWorkflow.id)).toBeDefined();
  });

  it('includes workflows without tags', () => {
    const result = filterWorkflowsForValidation(allWorkflows);

    expect(result.find((w) => w.id === workflowWithNoTags.id)).toBeDefined();
  });

  it('returns an empty array when given an empty array', () => {
    expect(filterWorkflowsForValidation([])).toEqual([]);
  });
});
