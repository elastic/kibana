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
    retrievedAlertCountSource: 'agent_esql_retrieval',
    passedAlertCount: null,
    validatedDiscoveryCount: 1,
    retrievalEvidence: {
      alertRetrievalMode: null,
      pipelineAlertRetrieval: null,
      pipelineCombinedAlerts: null,
      workflowExecutionsTrackingKeys: {},
      agentEsqlRowCounts: [],
      retrievalScope: null,
      unscopedAgentAlertRetrievalRowCounts: [],
      unscopedPipelineAlertRetrievalCounts: [],
    },
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
      expected: {
        expectedToolPath: [],
        expectedWorkflowStages: [],
        forbiddenAlertIds: ['ad-portable-loud-cluster-alert-3'],
      },
      metadata: { alertCount: 178, fixture: 'full-profile' },
    });

    expect(result.score).toBe(0);
  });

  it('NoiseFalsePositive fails when a forbidden noise ID is cited only in the Markdown fields', async () => {
    // alertIds is empty, so the structured scan alone finds nothing; the
    // noise citation is user-visible in detailsMarkdown and must still fail.
    const evaluator = createNoiseFalsePositiveEvaluator();
    const result = await evaluator.evaluate({
      expected: { forbiddenAlertIds: ['noise-alert-42'] } as never,
      output: {
        insights: [
          {
            title: 'Looks clean',
            summaryMarkdown: 'Chain summary',
            detailsMarkdown: 'Built from alert noise-alert-42 context.',
            alertIds: [],
          },
        ],
      } as never,
    } as never);

    expect(result.score).toBe(0);
  });

  it('NoiseFalsePositive does not flag a forbidden ID embedded in a longer different ID', async () => {
    // Word-boundary matching: 'noise-alert-4' must not match 'noise-alert-42'.
    const evaluator = createNoiseFalsePositiveEvaluator();
    const result = await evaluator.evaluate({
      expected: { forbiddenAlertIds: ['noise-alert-4'] } as never,
      output: {
        insights: [
          {
            title: 't',
            summaryMarkdown: 'Built from alert noise-alert-42 context.',
            detailsMarkdown: '',
            alertIds: [],
          },
        ],
      } as never,
    } as never);

    expect(result.score).toBe(1);
  });

  it('DiscoveryCountCap fails when discoveries exceed the configured cap', async () => {
    const evaluator = createDiscoveryCountCapEvaluator();
    const result = await evaluator.evaluate({
      input: {} as never,
      output: { ...baseOutput(), adToolResult: { status: 'completed', discoveryCount: 15 } },
      expected: { expectedToolPath: [], expectedWorkflowStages: [], maxDiscoveryCount: 12 },
      metadata: { alertCount: 178, fixture: 'full-profile' },
    });

    expect(result.score).toBe(0);
  });

  // The cap guards against excess, so EVERY observable count is held to it —
  // not just the first non-null one. A run reporting 7 via the tool count while
  // rendering 15 agent-authored insights must fail the 12 cap.
  it('DiscoveryCountCap takes the largest available count, not the first (tool count under cap, insights over)', async () => {
    const evaluator = createDiscoveryCountCapEvaluator();
    const output = baseOutput();
    output.adToolResult = { status: 'completed', discoveryCount: 7 };
    output.insights = Array.from({ length: 15 }, (_, i) => ({
      title: `Insight ${i}`,
      summaryMarkdown: 'summary',
      detailsMarkdown: 'details',
      alertIds: [`alert-${i}`],
    }));

    const result = await evaluator.evaluate({
      input: {} as never,
      output,
      expected: { expectedToolPath: [], expectedWorkflowStages: [], maxDiscoveryCount: 12 },
      metadata: { alertCount: 178, fixture: 'full-profile' },
    });

    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ discoveryCount: 15, maxDiscoveryCount: 12 });
  });

  it('MinValidatedDiscovery passes when validated discoveries meet the floor', async () => {
    const evaluator = createMinValidatedDiscoveryEvaluator();
    const result = await evaluator.evaluate({
      input: {} as never,
      output: baseOutput(),
      expected: { expectedToolPath: [], expectedWorkflowStages: [], minValidatedDiscoveryCount: 1 },
      metadata: { alertCount: 178, fixture: 'full-profile' },
    });

    expect(result.score).toBe(1);
  });

  // `insights` is parsed from model-authored message/reasoning content and
  // carries no proof that validation ran. A hallucinated fenced insight must
  // not satisfy the floor — that would let a vacuous FPR pass stand without
  // any validated discovery.
  it('MinValidatedDiscovery does not count rendered insights without validation evidence', async () => {
    const evaluator = createMinValidatedDiscoveryEvaluator();
    const output = baseOutput();
    // Remove BOTH validated sources: only the hallucinated insight remains.
    delete (output.workflow as { validatedDiscoveryCount?: number }).validatedDiscoveryCount;
    delete (output as { adToolResult?: unknown }).adToolResult;

    const result = await evaluator.evaluate({
      input: {} as never,
      output,
      expected: { expectedToolPath: [], expectedWorkflowStages: [], minValidatedDiscoveryCount: 1 },
      metadata: { alertCount: 178, fixture: 'full-profile' },
    });

    expect(result.score).toBe(0);
  });
});
