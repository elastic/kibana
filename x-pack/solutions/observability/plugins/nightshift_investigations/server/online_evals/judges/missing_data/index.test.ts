/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { missingDataJudge } from '.';
import { missingDataOutputSchema } from './prompt';

const round = {
  input: { message: 'Investigate the checkout latency alert' },
  steps: [
    { tool_id: 'platform.core.search', arguments: { index: 'traces-*' }, result: { hits: 0 } },
  ],
  response: { message: 'Cause not confirmed: no traces for the window.' },
};

const judgeReturning = (gaps: unknown[]) => {
  const chatComplete = jest.fn().mockResolvedValue({
    toolCalls: [{ function: { arguments: { gaps } } }],
  });
  return {
    chatComplete,
    evaluate: () =>
      missingDataJudge.evaluate({
        round,
        inferenceClient: { chatComplete } as unknown as BoundInferenceClient,
        log: loggingSystemMock.createLogger(),
      }),
  };
};

describe('nightshift_missing_data', () => {
  it('scores the number of gaps and one score per gap, labelled with its reason', async () => {
    const { evaluate, chatComplete } = judgeReturning([
      {
        what: 'Checkout traces',
        source: 'traces-apm*',
        why: 'not_retained',
        would_decide: 'Did the deploy add latency?',
      },
      { what: 'Payment gateway logs', why: 'no_access' },
    ]);

    const { scores } = await evaluate();

    expect(scores).toEqual([
      {
        name: 'missing_data_gaps',
        score: 2,
        label: '2 gaps',
        explanation: 'Gaps in the data that kept the investigation from confirming its cause',
      },
      {
        name: 'missing_data_gap',
        score: 1,
        label: 'not_retained',
        explanation: 'Checkout traces (traces-apm*); would decide: Did the deploy add latency?',
      },
      {
        name: 'missing_data_gap',
        score: 1,
        label: 'no_access',
        explanation: 'Payment gateway logs',
      },
    ]);
    const [{ toolChoice, messages }] = chatComplete.mock.calls[0];
    expect(toolChoice).toEqual({ function: 'report_missing_data' });
    expect(messages.at(-1).content).toContain('report_missing_data');
  });

  it('scores zero gaps when the investigation confirmed its cause', async () => {
    const { scores } = await judgeReturning([]).evaluate();

    expect(scores).toEqual([expect.objectContaining({ name: 'missing_data_gaps', score: 0 })]);
  });

  it('keeps at most three gaps', async () => {
    const { scores } = await judgeReturning(
      ['a', 'b', 'c', 'd'].map((what) => ({ what, why: 'not_queried' }))
    ).evaluate();

    expect(scores.filter(({ name }) => name === 'missing_data_gap')).toHaveLength(3);
    expect(scores[0]).toEqual(expect.objectContaining({ score: 3, label: '3 gaps' }));
  });

  it('only accepts the four reasons', () => {
    const schema = missingDataOutputSchema;

    expect(schema.safeParse({ gaps: [{ what: 'x', why: 'no_access' }] }).success).toBe(true);
    expect(schema.safeParse({ gaps: [{ what: 'x', why: 'because' }] }).success).toBe(false);
  });

  it('requires an input and a final answer', () => {
    const { evidenceSchema } = missingDataJudge;

    expect(
      evidenceSchema!.safeParse({ input: { message: 'q' }, response: { message: 'a' } }).success
    ).toBe(true);
    expect(evidenceSchema!.safeParse({ input: { message: 'q' } }).success).toBe(false);
  });
});
