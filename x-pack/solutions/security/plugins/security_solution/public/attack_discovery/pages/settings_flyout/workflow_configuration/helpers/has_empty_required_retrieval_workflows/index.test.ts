/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasEmptyRequiredRetrievalWorkflows } from '.';
import type { WorkflowConfiguration } from '../../types';

const baseConfig: WorkflowConfiguration = {
  alertRetrievalMode: 'custom_query',
  alertRetrievalWorkflowIds: [],
  alertRetrievalWorkflowsEnabled: false,
  defaultRetrievalEnabled: false,
  skillEnabled: false,
  validationWorkflowId: 'default',
};

describe('hasEmptyRequiredRetrievalWorkflows', () => {
  it('returns true when the workflows toggle is the sole enabled source and the selection is empty', () => {
    expect(
      hasEmptyRequiredRetrievalWorkflows({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: true,
        alertRetrievalWorkflowIds: [],
      })
    ).toBe(true);
  });

  it('returns false when the workflows toggle is enabled and a workflow is selected', () => {
    expect(
      hasEmptyRequiredRetrievalWorkflows({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: true,
        alertRetrievalWorkflowIds: ['workflow-1'],
      })
    ).toBe(false);
  });

  it('returns false when the workflows toggle is disabled', () => {
    expect(
      hasEmptyRequiredRetrievalWorkflows({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: false,
        alertRetrievalWorkflowIds: [],
      })
    ).toBe(false);
  });

  it('returns false when the skill toggle is also enabled (skill still provides alerts)', () => {
    expect(
      hasEmptyRequiredRetrievalWorkflows({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: true,
        alertRetrievalWorkflowIds: [],
        skillEnabled: true,
      })
    ).toBe(false);
  });

  it('returns false when the default retrieval toggle is also enabled (default retrieval still provides alerts)', () => {
    expect(
      hasEmptyRequiredRetrievalWorkflows({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: true,
        alertRetrievalWorkflowIds: [],
        defaultRetrievalEnabled: true,
      })
    ).toBe(false);
  });

  it('returns false when no toggle is enabled', () => {
    expect(hasEmptyRequiredRetrievalWorkflows(baseConfig)).toBe(false);
  });
});
