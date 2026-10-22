/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CAUSAL_CHECK_QUESTION,
  CAUSAL_CHECK_SYSTEM_PROMPT,
  checkCausalConfirmation,
} from './causal_check';

describe('checkCausalConfirmation', () => {
  const inferenceClient = (output: jest.Mock) => ({ output } as never);

  it('sends the transcript and the analysis question under the causal-check prompt', async () => {
    const output = jest.fn().mockResolvedValue({
      output: {
        is_feedback_message: true,
        causal_confirmed: true,
        causal_summary: 'Deploy doubled DB latency.',
        learning: 'Check deploys first.',
      },
    });

    const result = await checkCausalConfirmation({
      inferenceClient: inferenceClient(output),
      transcript: 'TRANSCRIPT',
    });

    expect(result).toEqual({
      isFeedbackMessage: true,
      causalConfirmed: true,
      causalSummary: 'Deploy doubled DB latency.',
      learning: 'Check deploys first.',
    });
    const call = output.mock.calls[0][0];
    expect(call.system).toBe(CAUSAL_CHECK_SYSTEM_PROMPT);
    expect(call.input).toBe(`TRANSCRIPT\n\n${CAUSAL_CHECK_QUESTION}`);
  });

  it('carries the prompt it was given: feedback and proof of work', () => {
    expect(CAUSAL_CHECK_SYSTEM_PROMPT).toContain('confirmed causal relationship');
    expect(CAUSAL_CHECK_SYSTEM_PROMPT).toContain('proof of work');
    expect(CAUSAL_CHECK_QUESTION).toContain('root-cause correction or confirmation');
  });

  it.each([
    ['an unusable answer', jest.fn().mockResolvedValue({ output: { nonsense: true } })],
    ['no output', jest.fn().mockResolvedValue({})],
    ['a failing model', jest.fn().mockRejectedValue(new Error('boom'))],
  ])('returns undefined for %s so the caller can fall back', async (_name, output) => {
    await expect(
      checkCausalConfirmation({ inferenceClient: inferenceClient(output), transcript: 't' })
    ).resolves.toBeUndefined();
  });

  it('defaults the optional fields', async () => {
    const output = jest.fn().mockResolvedValue({ output: { causal_confirmed: false } });

    await expect(
      checkCausalConfirmation({ inferenceClient: inferenceClient(output), transcript: 't' })
    ).resolves.toEqual({
      isFeedbackMessage: false,
      causalConfirmed: false,
      causalSummary: '',
      learning: '',
    });
  });
});
