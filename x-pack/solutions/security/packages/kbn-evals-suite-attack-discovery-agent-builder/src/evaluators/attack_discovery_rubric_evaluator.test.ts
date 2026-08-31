/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { createAttackDiscoveryRubricEvaluator } from './attack_discovery_rubric_evaluator';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

interface Params {
  input: AttackDiscoveryAgentBuilderExample['input'];
  output: AttackDiscoveryAgentBuilderTaskOutput;
  expected: AttackDiscoveryAgentBuilderExample['output'];
  metadata: AttackDiscoveryAgentBuilderExample['metadata'];
}

const insight: AttackDiscovery = {
  title: 'Credential access on finance-ws-01',
  summaryMarkdown: 'LSASS access following encoded PowerShell.',
  detailsMarkdown: 'rundll32 accessed lsass.exe after an encoded PowerShell execution.',
  alertIds: ['alert-1', 'alert-2'],
};

const baseOutput = (insights: AttackDiscovery[] | null): AttackDiscoveryAgentBuilderTaskOutput => ({
  messages: [],
  steps: [],
  errors: [],
  insights,
  workflow: {
    stages: [],
    retrievedAlertCount: null,
    passedAlertCount: null,
    validatedDiscoveryCount: null,
  },
});

const expectedFor = (
  attackDiscoveries?: AttackDiscovery[]
): AttackDiscoveryAgentBuilderExample['output'] => ({
  expectedToolPath: [],
  expectedWorkflowStages: [],
  expectedRetrievedAlertCount: null,
  expectedPassedAlertCount: null,
  ...(attackDiscoveries ? { attackDiscoveries } : {}),
});

describe('createAttackDiscoveryRubricEvaluator', () => {
  const judge = jest.fn();
  const criteria = jest.fn(() => ({
    name: 'criteria',
    kind: 'LLM' as const,
    direction: 'maximize',
    evaluate: judge,
  }));
  const evaluators = { criteria } as unknown as DefaultEvaluators;

  const evaluate = (params: {
    insights: AttackDiscovery[] | null;
    expected: AttackDiscoveryAgentBuilderExample['output'];
  }) =>
    createAttackDiscoveryRubricEvaluator({ evaluators }).evaluate({
      input: {} as Params['input'],
      output: baseOutput(params.insights),
      expected: params.expected,
      metadata: {} as Params['metadata'],
    } as Parameters<ReturnType<typeof createAttackDiscoveryRubricEvaluator>['evaluate']>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
    judge.mockResolvedValue({ score: 1, label: 'Y' });
  });

  describe('examples that carry reference attack discoveries', () => {
    it('delegates to the judge and returns its score', async () => {
      const result = await evaluate({
        insights: [insight],
        expected: expectedFor([insight]),
      });

      expect(judge).toHaveBeenCalledTimes(1);
      expect(result.score).toBe(1);
    });

    // Guards against the N/A branch becoming a blanket exemption: an example
    // that has a reference but produced nothing must still reach the judge and
    // keep whatever score the judge gives it.
    it('still delegates to the judge when the run produced no insights', async () => {
      judge.mockResolvedValue({ score: 0, label: 'N' });

      const result = await evaluate({ insights: null, expected: expectedFor([insight]) });

      expect(judge).toHaveBeenCalledTimes(1);
      expect(result.score).toBe(0);
    });
  });

  describe('examples that carry no reference attack discoveries by design', () => {
    // `missing-alert-retrieval` and `status-only` annotate neither
    // `attackDiscoveries` nor `criteria`; pre-fix the judge saw an empty
    // reference and an empty submission and scored a nondeterministic 0.
    it('returns N/A without invoking the judge when attackDiscoveries is absent', async () => {
      const result = await evaluate({ insights: null, expected: expectedFor() });

      expect(judge).not.toHaveBeenCalled();
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });

    it('returns N/A without invoking the judge when attackDiscoveries is empty', async () => {
      const result = await evaluate({ insights: null, expected: expectedFor([]) });

      expect(judge).not.toHaveBeenCalled();
      expect(result.score).toBeNull();
      expect(result.label).toBe('N/A');
    });
  });
});
