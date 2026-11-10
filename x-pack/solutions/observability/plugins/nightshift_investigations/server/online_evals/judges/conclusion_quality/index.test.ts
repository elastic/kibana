/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { conclusionQualityJudge } from '.';

describe('nightshift_conclusion_quality', () => {
  it('sends only the final answer and scales the grade to 0-1', async () => {
    const prompt = jest.fn().mockResolvedValue({
      toolCalls: [
        {
          function: {
            arguments: {
              conclusion_quality: 2,
              conclusion_reasoning: 'Names the deploy but cites little evidence.',
            },
          },
        },
      ],
    });

    const { scores } = await conclusionQualityJudge.evaluate({
      round: {
        input: { message: 'Investigate the checkout latency alert' },
        steps: [{ tool_id: 'platform.core.search', result: { hits: 3 } }],
        response: { message: 'The 14:02 deploy of checkout caused the latency.' },
      },
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      log: loggingSystemMock.createLogger(),
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(prompt.mock.calls[0][0].input).toEqual({
      answer: 'The 14:02 deploy of checkout caused the latency.',
    });
    expect(prompt.mock.calls[0][0].toolChoice).toEqual({ function: 'score_conclusion' });
    expect(prompt.mock.calls[0][0].metadata.connectorTelemetry).toEqual({
      pluginId: 'nightshift_online_evals',
      aggregateBy: 'nightshift',
      productSolution: 'observability',
      productFeature: 'nightshift',
    });
    expect(scores).toEqual([
      {
        name: 'rca_conclusion_quality',
        score: 0.667,
        label: '2/3',
        explanation: 'Names the deploy but cites little evidence.',
      },
    ]);
  });

  it('grades the hypotheses panel as part of the answer', async () => {
    const prompt = jest.fn().mockResolvedValue({
      toolCalls: [
        { function: { arguments: { conclusion_quality: 3, conclusion_reasoning: 'ok' } } },
      ],
    });

    await conclusionQualityJudge.evaluate({
      round: { input: { message: 'q' }, steps: [], response: { message: 'See the panel.' } },
      referenceData: {
        hypotheses: [{ candidate: 'The 14:02 deploy', status: 'confirmed', confidence: 0.9 }],
      },
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      log: loggingSystemMock.createLogger(),
    });

    expect(prompt.mock.calls[0][0].input.answer).toBe(
      'See the panel.\n\n## Hypotheses panel (shown to the user)\n- [confirmed] The 14:02 deploy (confidence 0.9)'
    );
  });

  it('requires a final answer', () => {
    const { evidenceSchema } = conclusionQualityJudge;

    expect(evidenceSchema!.safeParse({ response: { message: 'answer' } }).success).toBe(true);
    expect(evidenceSchema!.safeParse({ response: { message: '' } }).success).toBe(false);
  });
});
