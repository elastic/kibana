/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateLatestPolicyResponseCoverageIncomplete } from './latest_policy_response_aggregation';

describe('evaluateLatestPolicyResponseCoverageIncomplete', () => {
  it.each([
    { skipped: 1, successful: 1, total: 2 },
    { details: { 'remote-a': { status: 'failed' } } },
  ])('is true for observable policy-response cluster gaps %#', (policyClusters) => {
    expect(
      evaluateLatestPolicyResponseCoverageIncomplete({
        policyClusters,
      })
    ).toBe(true);
  });

  it('is true when United clusters are partial while policy-response cluster metadata is complete', () => {
    expect(
      evaluateLatestPolicyResponseCoverageIncomplete({
        policyClusters: { successful: 2, total: 2 },
        unitedClusters: { partial: 1, successful: 1, total: 2 },
      })
    ).toBe(true);
  });

  it('is false when _clusters metadata is absent', () => {
    expect(
      evaluateLatestPolicyResponseCoverageIncomplete({
        policyClusters: undefined,
      })
    ).toBe(false);
  });
});
