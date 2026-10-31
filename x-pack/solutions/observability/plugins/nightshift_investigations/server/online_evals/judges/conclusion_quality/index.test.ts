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
    expect(scores).toEqual([
      {
        name: 'rca_conclusion_quality',
        score: 0.667,
        label: '2/3',
        explanation: 'Names the deploy but cites little evidence.',
      },
    ]);
  });

  it('requires a final answer', () => {
    const { evidenceSchema } = conclusionQualityJudge;

    expect(evidenceSchema!.safeParse({ response: { message: 'answer' } }).success).toBe(true);
    expect(evidenceSchema!.safeParse({ response: { message: '' } }).success).toBe(false);
  });
});
