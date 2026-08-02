/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkflowEvidenceEvaluator } from './workflow_evidence_evaluator';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const baseOutput = (
  overrides: Partial<AttackDiscoveryAgentBuilderTaskOutput['workflow']>
): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: [],
  errors: [],
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    passedAlertCount: null,
    validatedDiscoveryCount: null,
    ...overrides,
  },
});

const baseExpected = (
  overrides: Partial<AttackDiscoveryAgentBuilderExample['output']>
): AttackDiscoveryAgentBuilderExample['output'] => ({
  expectedToolPath: [],
  expectedWorkflowStages: [],
  expectedRetrievedAlertCount: null,
  expectedPassedAlertCount: null,
  ...overrides,
});

describe('createWorkflowEvidenceEvaluator', () => {
  const evaluator = createWorkflowEvidenceEvaluator();

  // Fix 1: passedAlertCount must not silently mirror the pipeline's
  // retrieved count. Without the fix, `output.workflow.passedAlertCount`
  // would have been derived from the same source as retrievedAlertCount,
  // making this scenario indistinguishable from a real match.
  it('fails when the pipeline reports a passed count that does not match expectations', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 10, passedAlertCount: 999 }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: 10 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(0);
    expect(result.metadata?.evidenceState).toBe('complete');
  });

  it('scores complete and passes when both counts match exactly', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: 10, passedAlertCount: 10 }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: 10 }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(1);
    expect(result.metadata?.evidenceState).toBe('complete');
  });

  // Fix 3: a `null` expectation asserts the pipeline reports `null`, not an
  // excuse to skip scoring. Pre-fix, `passedCountAvailable` required
  // `expectedPassedAlertCount != null`, so these negative-path examples
  // always scored `undefined` / `incomplete` regardless of what the run
  // actually reported.
  it('fails when expectedPassedAlertCount is null but the run reports a bogus non-null count', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: 5 }),
      expected: baseExpected({ expectedRetrievedAlertCount: null, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(0);
  });

  it('passes when expectedPassedAlertCount is null and the run reports null', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: null }),
      expected: baseExpected({ expectedRetrievedAlertCount: null, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('complete');
    expect(result.score).toBe(1);
  });

  it('reports incomplete evidence when retrieval was expected but the pipeline never reported a count', async () => {
    const params: Params = {
      input: {} as Params['input'],
      output: baseOutput({ retrievedAlertCount: null, passedAlertCount: null }),
      expected: baseExpected({ expectedRetrievedAlertCount: 10, expectedPassedAlertCount: null }),
      metadata: {} as Params['metadata'],
    };

    const result = await evaluator.evaluate(params);

    expect(result.metadata?.evidenceState).toBe('incomplete');
    expect(result.score).toBeUndefined();
  });
});
