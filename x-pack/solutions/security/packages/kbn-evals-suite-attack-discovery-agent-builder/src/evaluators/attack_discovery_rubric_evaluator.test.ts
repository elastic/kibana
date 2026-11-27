/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { DefaultEvaluators } from '@kbn/evals';
import { createAttackDiscoveryRubricEvaluator } from './attack_discovery_rubric_evaluator';
import { EMPTY_RETRIEVAL_EVIDENCE } from '../types';
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
    retrievedAlertCountSource: 'none',
    passedAlertCount: null,
    validatedDiscoveryCount: null,
    retrievalEvidence: EMPTY_RETRIEVAL_EVIDENCE,
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

const httpError = (status: number, message: string): Error =>
  Object.assign(new Error(message), { status });

describe('createAttackDiscoveryRubricEvaluator', () => {
  const judge = jest.fn();
  const criteria = jest.fn(() => ({
    name: 'criteria',
    kind: 'LLM' as const,
    direction: 'maximize',
    evaluate: judge,
  }));
  const evaluators = { criteria } as unknown as DefaultEvaluators;
  const log = { warning: jest.fn(), info: jest.fn() } as unknown as ToolingLog;

  const evaluate = (params: {
    insights: AttackDiscovery[] | null;
    expected: AttackDiscoveryAgentBuilderExample['output'];
  }) =>
    createAttackDiscoveryRubricEvaluator({ evaluators, log }).evaluate({
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

  describe('when the judge never produces a score', () => {
    // Build 01a12766: 2 of 30 cells stored only "LLM could not complete task
    // successfully in 4 attempts", which names neither the transport failure nor
    // the parse/validation failure the judge actually hit.
    it('names the underlying cause instead of only the retry-loop wrapper', async () => {
      const criterionError = new Error('Could not find criterion for id "xkvb"');
      judge.mockRejectedValue(
        new AggregateError(
          [criterionError, criterionError],
          'LLM could not complete task successfully in 4 attempts'
        )
      );

      const result = await evaluate({ insights: [insight], expected: expectedFor([insight]) });

      // The judge prompt already retried its own tool call four times, so a
      // validation failure must not be retried again at this layer.
      expect(judge).toHaveBeenCalledTimes(1);
      expect(result.score).toBeNull();
      expect(result.label).toBe('judge_failed');
      expect(result.explanation).toContain(
        'LLM could not complete task successfully in 4 attempts'
      );
      expect(result.explanation).toContain('Could not find criterion for id "xkvb" (x2)');
      expect(result.metadata).toEqual({
        judgeAttempts: 1,
        judgeFailures: [
          'LLM could not complete task successfully in 4 attempts — Could not find criterion for id "xkvb" (x2)',
        ],
      });
      expect(log.warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not find criterion for id "xkvb"')
      );
    });

    it('retries a judge-side transport failure and keeps the score', async () => {
      judge
        .mockRejectedValueOnce(
          httpError(408, 'inference stream exceeded the maximum allowed duration')
        )
        .mockResolvedValueOnce({ score: 1, label: 'Y' });

      const result = await evaluate({ insights: [insight], expected: expectedFor([insight]) });

      expect(judge).toHaveBeenCalledTimes(2);
      expect(result.score).toBe(1);
      expect(result.metadata).toEqual({ judgeAttempts: 2 });
      expect(log.warning).toHaveBeenCalledTimes(1);
    });

    it('records the cell as unscored after the bounded retries are spent', async () => {
      judge.mockRejectedValue(httpError(503, 'upstream unavailable'));

      const result = await evaluate({ insights: [insight], expected: expectedFor([insight]) });

      expect(judge).toHaveBeenCalledTimes(3); // first attempt plus two retries
      expect(result.score).toBeNull();
      expect(result.label).toBe('judge_failed');
      expect(result.explanation).toContain('Rubric judge failed after 3 attempt(s)');
      expect(result.explanation).toContain('HTTP 503: upstream unavailable');
      expect(log.warning).toHaveBeenCalledTimes(3);
    });

    it('does not retry a judge failure that the judge prompt already retried', async () => {
      judge.mockRejectedValue(new Error('Missing scores for xkvb'));

      const result = await evaluate({ insights: [insight], expected: expectedFor([insight]) });

      expect(judge).toHaveBeenCalledTimes(1);
      expect(result.explanation).toBe(
        'Rubric judge failed after 1 attempt(s): Missing scores for xkvb'
      );
    });
  });
});
