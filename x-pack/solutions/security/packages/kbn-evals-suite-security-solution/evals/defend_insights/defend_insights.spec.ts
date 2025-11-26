/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import type { DefendInsightsDatasetExample } from '../../src/evaluators';

/**
 * Sample Defend Insights dataset for policy response failures
 * This can be replaced with a loaded dataset from JSON file once available
 */
const defendInsightsDataset: {
  name: string;
  description: string;
  examples: DefendInsightsDatasetExample[];
} = {
  name: 'Defend Insights - Policy Response Failures',
  description: 'Tests for Defend Insights policy response failure analysis',
  examples: [],
};

/**
 * Default endpoint IDs for evaluation
 * These should be configured per environment
 */
const DEFAULT_ENDPOINT_IDS = ['default-endpoint-id'];

evaluate.describe('Defend Insights', { tag: '@svlSecurity' }, () => {
  evaluate('policy response failures', async ({ evaluateDefendInsightsDataset }) => {
    await evaluateDefendInsightsDataset({
      dataset: defendInsightsDataset,
      endpointIds: DEFAULT_ENDPOINT_IDS,
      insightType: 'policy_response_failure',
    });
  });
});
