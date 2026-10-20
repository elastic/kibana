/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasAtLeastOneRetrievalToggle } from '.';
import type { WorkflowConfiguration } from '../../types';

const baseConfig: WorkflowConfiguration = {
  alertRetrievalMode: 'custom_query',
  alertRetrievalWorkflowIds: [],
  alertRetrievalWorkflowsEnabled: false,
  defaultRetrievalEnabled: false,
  skillEnabled: false,
  validationWorkflowId: 'default',
};

describe('hasAtLeastOneRetrievalToggle', () => {
  it('returns false when no toggle is enabled', () => {
    expect(hasAtLeastOneRetrievalToggle(baseConfig)).toBe(false);
  });

  it('returns true when only the skill toggle is enabled', () => {
    expect(hasAtLeastOneRetrievalToggle({ ...baseConfig, skillEnabled: true })).toBe(true);
  });

  it('returns true when only the default retrieval toggle is enabled', () => {
    expect(hasAtLeastOneRetrievalToggle({ ...baseConfig, defaultRetrievalEnabled: true })).toBe(
      true
    );
  });

  it('returns true when only the alert retrieval workflows toggle is enabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({ ...baseConfig, alertRetrievalWorkflowsEnabled: true })
    ).toBe(true);
  });

  it('returns true when all toggles are enabled', () => {
    expect(
      hasAtLeastOneRetrievalToggle({
        ...baseConfig,
        alertRetrievalWorkflowsEnabled: true,
        defaultRetrievalEnabled: true,
        skillEnabled: true,
      })
    ).toBe(true);
  });
});
