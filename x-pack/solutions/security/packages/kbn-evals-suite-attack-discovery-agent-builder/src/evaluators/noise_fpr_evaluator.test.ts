/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDiscoveryCountCapEvaluator,
  createMinValidatedDiscoveryEvaluator,
  createNoiseFalsePositiveEvaluator,
} from './noise_fpr_evaluator';
import type { AttackDiscoveryAgentBuilderTaskOutput } from '../types';

const baseOutput = (): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: [],
  errors: [],
  insights: [
    {
      title: 'Chain on wks-alice-01',
      summaryMarkdown: 'summary',
      detailsMarkdown: 'details',
      alertIds: ['ad-portable-encoded-powershell-alert-1'],
    },
  ],
  workflow: {
    stages: ['generation', 'validation'],
    retrievedAlertCount: 178,
    passedAlertCount: null,
    validatedDiscoveryCount: 1,
  },
  adToolResult: {
    status: 'completed',
    discoveryCount: 1,
  },
});

describe('noise FPR evaluators', () => {
  it('NoiseFalsePositive fails when insights cite forbidden noise alert IDs', async () => {
    const evaluator = createNoiseFalsePositiveEvaluator();
    const output = baseOutput();
    output.insights = [
      {
        title: 'Noise',
        summaryMarkdown: 'summary',
        detailsMarkdown: 'details',
        alertIds: ['ad-portable-loud-cluster-alert-3'],
      },
    ];

    const result = await evaluator.evaluate({
      input: {} as never,
      output,
      expected: { forbiddenAlertIds: ['ad-portable-loud-cluster-alert-3'] },
      metadata: {},
    });

    expect(result.score).toBe(0);
  });

  it('DiscoveryCountCap fails when discoveries exceed the configured cap', async () => {
    const evaluator = createDiscoveryCountCapEvaluator();
    const result = await evaluator.evaluate({
      input: {} as never,
      output: { ...baseOutput(), adToolResult: { status: 'completed', discoveryCount: 15 } },
      expected: { maxDiscoveryCount: 12 },
      metadata: {},
    });

    expect(result.score).toBe(0);
  });

  it('MinValidatedDiscovery passes when validated discoveries meet the floor', async () => {
    const evaluator = createMinValidatedDiscoveryEvaluator();
    const result = await evaluator.evaluate({
      input: {} as never,
      output: baseOutput(),
      expected: { minValidatedDiscoveryCount: 1 },
      metadata: {},
    });

    expect(result.score).toBe(1);
  });
});
