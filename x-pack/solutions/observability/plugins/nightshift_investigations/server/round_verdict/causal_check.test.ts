/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  CAUSAL_CHECK_SYSTEM_PROMPT,
  buildCausalCheckTranscript,
  createLlmCausalCheck,
  type EarlierRound,
} from './causal_check';

const round = (id: string, message: string, answer: string, steps: unknown[] = []) =>
  ({ id, input: { message }, response: { message: answer }, steps } satisfies EarlierRound);

const setHypotheses = (candidates: string[]) => ({
  type: 'tool_call',
  tool_call_id: `h-${candidates.join('-')}`,
  tool_id: SET_HYPOTHESES_TOOL_ID,
  params: { hypotheses: candidates.map((candidate) => ({ candidate, status: 'investigating' })) },
});

describe('buildCausalCheckTranscript', () => {
  it('shows the earlier rounds with their latest hypotheses, then the follow-up', () => {
    const transcript = buildCausalCheckTranscript({
      earlierRounds: [
        round('r1', 'Alert: checkout errors', 'The payment processor is down.', [
          setHypotheses(['payment processor outage']),
          setHypotheses(['payment processor outage', 'inventory rollout']),
        ]),
      ],
      prompt: 'Slack user <@U1> wrote: it was the inventory 2.14.0 deploy, we rolled it back',
      response: 'Errors stopped right after the rollback.',
      toolCalls: [{ tool_id: 'nightshift_sandbox_bash', params: { command: 'esql' } }],
    });

    expect(transcript).toContain('### Round 1\nMessage: Alert: checkout errors');
    expect(transcript).toContain(
      'Hypotheses: [{"candidate":"payment processor outage","status":"investigating"},{"candidate":"inventory rollout","status":"investigating"}]'
    );
    expect(transcript).toContain('Answer: The payment processor is down.');
    expect(transcript).toContain(
      'Human message: Slack user <@U1> wrote: it was the inventory 2.14.0 deploy'
    );
    expect(transcript).toContain('- nightshift_sandbox_bash {"command":"esql"}');
    expect(transcript).toContain("Investigator's answer: Errors stopped right after the rollback.");
  });

  it('drops the oldest rounds first when the investigation is long', () => {
    const long = 'x'.repeat(5_000);
    const transcript = buildCausalCheckTranscript({
      earlierRounds: Array.from({ length: 10 }, (_, i) => round(`r${i}`, `round ${i}`, long)),
      prompt: 'p',
      response: 'r',
      toolCalls: [],
    });

    expect(transcript).toContain('earlier rounds omitted');
    expect(transcript).not.toContain('Message: round 0\n');
    expect(transcript).toContain('Message: round 9\n');
  });
});

describe('createLlmCausalCheck', () => {
  const output = jest.fn();
  const check = createLlmCausalCheck({
    inferenceClient: { output } as unknown as BoundInferenceClient,
  });

  beforeEach(() => {
    output.mockReset();
  });

  it("asks with Deductive's causal check prompt and returns its verdict", async () => {
    output.mockResolvedValue({
      output: {
        is_feedback_message: true,
        causal_confirmed: true,
        causal_summary: 'The inventory deploy caused it.',
        learning: 'Check recent deploys first.',
      },
    });

    await expect(check('transcript')).resolves.toEqual({
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: 'The inventory deploy caused it.',
      learning: 'Check recent deploys first.',
    });
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'nightshift_causal_check',
        system: CAUSAL_CHECK_SYSTEM_PROMPT,
        input: expect.stringMatching(/^transcript\n\nBased on the investigation transcript/),
      })
    );
  });

  it('never confirms a cause from a message that is not feedback', async () => {
    output.mockResolvedValue({
      output: { is_feedback_message: false, causal_confirmed: true, causal_summary: 'x' },
    });

    await expect(check('transcript')).resolves.toMatchObject({
      isFeedback: false,
      causalConfirmed: false,
      learning: '',
    });
  });
});
