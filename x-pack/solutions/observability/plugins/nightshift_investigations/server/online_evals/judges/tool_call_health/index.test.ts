/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { toolCallHealthJudge } from '.';

const judgeReturning = (args: Record<string, unknown>) =>
  jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: args } }] });

const evaluate = (
  prompt: jest.Mock,
  steps: Array<{ tool_id: string; result: unknown }>
): ReturnType<typeof toolCallHealthJudge.evaluate> =>
  toolCallHealthJudge.evaluate({
    round: {
      input: { message: 'Investigate the checkout latency alert' },
      steps,
      response: { message: 'The 14:02 deploy of checkout caused the latency.' },
    },
    inferenceClient: { prompt } as unknown as BoundInferenceClient,
    log: loggingSystemMock.createLogger(),
  });

describe('nightshift_tool_call_health', () => {
  it('counts the failed and the no-data calls from one judge call', async () => {
    const prompt = judgeReturning({
      failed_calls: [
        { step: 1, reason: 'The query was rejected.' },
        { step: 1, reason: 'A repeat of the same call.' },
        { step: 9, reason: 'There is no call 9.' },
      ],
      empty_calls: [
        { step: 1, reason: 'Already counted as failed.' },
        { step: 2, reason: 'No hits came back.' },
      ],
    });

    const result = await evaluate(prompt, [
      { tool_id: 'platform.core.search', result: [{ type: 'error', data: { message: 'bad' } }] },
      { tool_id: 'platform.core.search', result: [{ type: 'other', data: { hits: [] } }] },
    ]);

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(prompt.mock.calls[0][0].toolChoice).toEqual({ function: 'score_tool_call_health' });
    expect(prompt.mock.calls[0][0].input.question).toBe('Investigate the checkout latency alert');
    expect(prompt.mock.calls[0][0].input.toolCalls).toContain(
      '## Tool call 2: platform.core.search'
    );
    expect(result.scores).toEqual([
      {
        name: 'tool_calls_failed',
        score: 1,
        label: 'failed',
        explanation: 'call 1: The query was rejected.',
      },
      {
        name: 'tool_calls_empty',
        score: 1,
        label: 'no-data',
        explanation: 'call 2: No hits came back.',
      },
    ]);
  });

  it('scores zero with a "none" label when the judge finds nothing', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });

    const { scores } = await evaluate(prompt, [{ tool_id: 'platform.core.search', result: [] }]);

    expect(scores.map(({ name, score, label }) => ({ name, score, label }))).toEqual([
      { name: 'tool_calls_failed', score: 0, label: 'none' },
      { name: 'tool_calls_empty', score: 0, label: 'none' },
    ]);
  });

  it('is not applicable, without calling the judge, when the agent made no tool calls', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });

    const { scores } = await evaluate(prompt, []);

    expect(prompt).not.toHaveBeenCalled();
    expect(scores.map(({ score, label }) => ({ score, label }))).toEqual([
      { score: null, label: 'n/a' },
      { score: null, label: 'n/a' },
    ]);
  });

  it('is not applicable when tool calls were left out to fit the judge context', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });
    const bigResult = 'x'.repeat(10_000);

    const { scores } = await evaluate(
      prompt,
      Array.from({ length: 60 }, () => ({ tool_id: 'platform.core.search', result: bigResult }))
    );

    expect(prompt).not.toHaveBeenCalled();
    expect(scores.map(({ score, label }) => ({ score, label }))).toEqual([
      { score: null, label: 'n/a' },
      { score: null, label: 'n/a' },
    ]);
    expect(scores[0].explanation).toContain('did not fit');
  });

  it('requires a user input and a final answer', () => {
    const { evidenceSchema } = toolCallHealthJudge;

    expect(
      evidenceSchema!.safeParse({ input: { message: 'q' }, response: { message: 'a' } }).success
    ).toBe(true);
    expect(evidenceSchema!.safeParse({ response: { message: 'a' } }).success).toBe(false);
  });
});
