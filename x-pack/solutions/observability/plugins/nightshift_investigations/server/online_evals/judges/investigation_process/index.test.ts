/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '@kbn/evals-plugin/server';
import type { InvestigationProcessOutput } from './prompt';
import { investigationProcessJudge } from '.';

const round: EvidenceRound = {
  input: { message: 'Investigate the checkout latency alert' },
  steps: [{ tool_id: 'platform.core.search', arguments: { q: 'checkout' }, result: { hits: 3 } }],
  response: { message: 'The 14:02 deploy of checkout caused the latency.' },
};

const judgeOutput = (
  overrides: Partial<InvestigationProcessOutput> = {}
): InvestigationProcessOutput => ({
  monitor_semantics: 3,
  monitor_semantics_reasoning: 'Used the latency threshold window.',
  decision_tree_applicable: true,
  decision_tree_usage: 2,
  decision_tree_reasoning: 'Followed most of the latency tree.',
  causal_validation: 2,
  causal_validation_reasoning: 'Checked timing and scope of the deploy.',
  hypothesis_coverage_applicable: true,
  hypothesis_coverage: 1,
  hypothesis_coverage_reasoning: 'Only considered the deploy.',
  evidence_grounding: 3,
  evidence_grounding_reasoning: 'Cited deploy events and latency metrics.',
  stop_condition: 0,
  stop_condition_reasoning: 'Repeated the same search several times.',
  ...overrides,
});

const evaluate = (output: unknown) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: output } }] });
  return {
    prompt,
    result: investigationProcessJudge.evaluate({
      round,
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      log: loggingSystemMock.createLogger(),
    }),
  };
};

describe('nightshift_investigation_process', () => {
  it('sends the rendered round and scales each 0-3 grade to 0-1', async () => {
    const { prompt, result } = evaluate(judgeOutput());

    const { scores } = await result;

    const { input, toolChoice } = prompt.mock.calls[0][0];
    expect(toolChoice).toEqual({ function: 'score_investigation_process' });
    expect(input.transcript).toContain('## Tool call 1: platform.core.search');
    expect(scores).toEqual([
      {
        name: 'rca_monitor_semantics_ok',
        score: 1,
        label: '3/3',
        explanation: 'Used the latency threshold window.',
      },
      {
        name: 'rca_decision_tree_usage',
        score: 0.667,
        label: '2/3',
        explanation: 'Followed most of the latency tree.',
      },
      {
        name: 'rca_causal_validation',
        score: 0.667,
        label: '2/3',
        explanation: 'Checked timing and scope of the deploy.',
      },
      {
        name: 'rca_hypothesis_coverage',
        score: 0.333,
        label: '1/3',
        explanation: 'Only considered the deploy.',
      },
      {
        name: 'rca_evidence_grounding',
        score: 1,
        label: '3/3',
        explanation: 'Cited deploy events and latency metrics.',
      },
      {
        name: 'rca_stop_condition_ok',
        score: 0,
        label: '0/3',
        explanation: 'Repeated the same search several times.',
      },
    ]);
  });

  it('drops decision tree usage and hypothesis coverage when they do not apply', async () => {
    const { result } = evaluate(
      judgeOutput({ decision_tree_applicable: false, hypothesis_coverage_applicable: false })
    );

    const { scores } = await result;

    expect(scores.map(({ name }) => name)).toEqual([
      'rca_monitor_semantics_ok',
      'rca_causal_validation',
      'rca_evidence_grounding',
      'rca_stop_condition_ok',
    ]);
  });
});
