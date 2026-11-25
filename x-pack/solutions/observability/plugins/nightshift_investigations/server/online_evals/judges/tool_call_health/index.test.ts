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
  steps: Array<{ tool_id: string; result: unknown; arguments?: unknown }>
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
      failed_calls: [1, 1, 9],
      failed_summary: 'The query was rejected.',
      empty_calls: [1, 2],
      empty_summary: 'No hits came back.',
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
    // Call 9 does not exist, a repeat counts once, and a failed call is not also an empty one.
    expect(result.scores).toEqual([
      {
        name: 'tool_calls_failed',
        score: 1,
        label: '1/2',
        explanation: 'The query was rejected.',
      },
      {
        name: 'tool_calls_empty',
        score: 1,
        label: '1/2',
        explanation: 'No hits came back.',
      },
    ]);
  });

  it('scores zero out of the number of calls when the judge finds nothing', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });

    const { scores } = await evaluate(prompt, [{ tool_id: 'platform.core.search', result: [] }]);

    expect(scores.map(({ name, score, label }) => ({ name, score, label }))).toEqual([
      { name: 'tool_calls_failed', score: 0, label: '0/1' },
      { name: 'tool_calls_empty', score: 0, label: '0/1' },
    ]);
  });

  it('is not applicable, without calling the judge, when the agent made no tool calls', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });

    const result = await evaluate(prompt, []);

    expect(prompt).not.toHaveBeenCalled();
    expect(result).toEqual({
      scores: [],
      notApplicable: { reason: 'The investigation made no tool calls.' },
    });
  });

  it('is not applicable when tool calls were left out to fit the judge context', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });
    const big = 'x'.repeat(10_000);

    // Each argument and result is cut to a couple of thousand characters, so it takes many
    // large calls to overflow the judge's context.
    const result = await evaluate(
      prompt,
      Array.from({ length: 150 }, () => ({
        tool_id: 'platform.core.search',
        arguments: big,
        result: big,
      }))
    );

    expect(prompt).not.toHaveBeenCalled();
    expect(result.scores).toEqual([]);
    expect(result.notApplicable?.reason).toContain('did not fit');
  });

  it('keeps the start and the end of a long result, where the outcome usually is', async () => {
    const prompt = judgeReturning({ failed_calls: [], empty_calls: [] });
    const result = `START${'x'.repeat(10_000)}exit_code: 22 END`;

    await evaluate(prompt, [{ tool_id: 'nightshift_sandbox_bash', result }]);

    const { toolCalls } = prompt.mock.calls[0][0].input;
    expect(toolCalls).toContain('START');
    expect(toolCalls).toContain('exit_code: 22 END');
    expect(toolCalls).toMatch(/\[truncated \d+ characters\]/);
    expect(toolCalls.length).toBeLessThan(3_000);
  });

  it('counts every call with one short summary when there are many', async () => {
    const prompt = judgeReturning({
      failed_calls: [1, 2, 3, 4, 5, 6, 7, 8],
      failed_summary: 'Calls 1-8: the sandbox refused every connection.',
      empty_calls: [],
      empty_summary: '',
    });

    const { scores } = await evaluate(
      prompt,
      Array.from({ length: 10 }, () => ({ tool_id: 'nightshift_sandbox_bash', result: [] }))
    );

    expect(scores[0]).toEqual({
      name: 'tool_calls_failed',
      score: 8,
      label: '8/10',
      explanation: 'Calls 1-8: the sandbox refused every connection.',
    });
    expect(scores[1].explanation).toBe('No no-data tool calls.');
  });

  it('trims a summary longer than the limit it asked for', async () => {
    const prompt = judgeReturning({
      failed_calls: [1],
      failed_summary: 'x'.repeat(500),
      empty_calls: [],
    });

    const { scores } = await evaluate(prompt, [{ tool_id: 'platform.core.search', result: [] }]);

    expect(scores[0].explanation).toBe('x'.repeat(200));
  });

  it('names the calls when the judge wrote no summary', async () => {
    const prompt = judgeReturning({ failed_calls: [2, 1], failed_summary: '  ', empty_calls: [] });

    const { scores } = await evaluate(prompt, [
      { tool_id: 'platform.core.search', result: [] },
      { tool_id: 'platform.core.search', result: [] },
    ]);

    expect(scores[0].explanation).toBe('calls 1, 2');
  });

  it('requires a user input and a final answer', () => {
    const { evidenceSchema } = toolCallHealthJudge;

    expect(
      evidenceSchema!.safeParse({ input: { message: 'q' }, response: { message: 'a' } }).success
    ).toBe(true);
    expect(evidenceSchema!.safeParse({ response: { message: 'a' } }).success).toBe(false);
  });
});
