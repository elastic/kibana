/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HYPOTHESES_ATTACHMENT_TYPE } from '@kbn/agentic-investigations-plugin/common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  CAUSAL_CHECK_SYSTEM_PROMPT,
  buildCausalCheckTranscript,
  createLlmCausalCheck,
  type EarlierRound,
} from './causal_check';

const round = (
  id: string,
  startedAt: string,
  message: string,
  answer: string,
  steps: unknown[] = []
) =>
  ({
    id,
    started_at: startedAt,
    input: { message },
    response: { message: answer },
    steps,
  } satisfies EarlierRound);

const spanQuery = {
  type: 'tool_call',
  tool_call_id: 'q1',
  tool_id: 'nightshift_sandbox_bash',
  params: { command: 'esql spans' },
  results: [{ type: 'other', data: { stdout: '115 calls to api.paygate-eu.net took 10s' } }],
};

const hypothesesVersion = (createdAt: string, status: string) => ({
  created_at: createdAt,
  data: {
    hypotheses: [{ candidate: 'paygate-eu timeouts', status, reason: 'spans hit 10s' }],
  },
});

describe('buildCausalCheckTranscript', () => {
  it('shows each earlier round with its tool results and hypotheses, then the follow-up', () => {
    const transcript = buildCausalCheckTranscript({
      earlierRounds: [
        round('r1', '2026-11-02T10:00:00.000Z', 'Alert: checkout errors', 'Paygate timed out.', [
          spanQuery,
        ]),
      ],
      attachments: [
        {
          type: HYPOTHESES_ATTACHMENT_TYPE,
          versions: [hypothesesVersion('2026-11-02T10:05:00.000Z', 'investigating')],
        },
      ],
      latestStartedAt: Date.parse('2026-11-02T10:10:00.000Z'),
      prompt: 'Slack user <@U1> wrote: yes, the paygate incident was the cause',
      response: 'The data agrees.',
      toolCalls: [{ tool_id: 'nightshift_sandbox_bash', params: { command: 'esql' } }],
    });

    expect(transcript).toContain('### Round 1\nMessage: Alert: checkout errors');
    expect(transcript).toContain('- nightshift_sandbox_bash {"command":"esql spans"}');
    expect(transcript).toContain('result: stdout: 115 calls to api.paygate-eu.net took 10s');
    expect(transcript).toContain(
      'Hypotheses: [{"candidate":"paygate-eu timeouts","status":"investigating","reason":"spans hit 10s"}]'
    );
    expect(transcript).toContain('Answer: Paygate timed out.');
    expect(transcript).toContain(
      'Human message: Slack user <@U1> wrote: yes, the paygate incident was the cause'
    );
    expect(transcript).toContain('- nightshift_sandbox_bash {"command":"esql"}');
    expect(transcript).toContain("Investigator's answer: The data agrees.");
  });

  // The findings recorder may already have updated the hypotheses for the follow-up under test.
  it('shows an earlier round the hypotheses from before the follow-up, not after it', () => {
    const transcript = buildCausalCheckTranscript({
      earlierRounds: [round('r1', '2026-11-02T10:00:00.000Z', 'Alert', 'Answer')],
      attachments: [
        {
          type: HYPOTHESES_ATTACHMENT_TYPE,
          versions: [
            hypothesesVersion('2026-11-02T10:05:00.000Z', 'investigating'),
            hypothesesVersion('2026-11-02T10:12:00.000Z', 'confirmed'),
          ],
        },
      ],
      latestStartedAt: Date.parse('2026-11-02T10:10:00.000Z'),
      prompt: 'p',
      response: 'r',
      toolCalls: [],
    });

    expect(transcript).toContain('"status":"investigating"');
    expect(transcript).not.toContain('"status":"confirmed"');
  });

  // When the post-round hook runs before the follow-up round is saved, its start time is unknown.
  // Falling back to `Date.now()` would attribute hypotheses written during the follow-up to the
  // last earlier round.
  it('omits the last earlier round hypotheses when the follow-up start time is unknown', () => {
    const transcript = buildCausalCheckTranscript({
      earlierRounds: [
        round('r1', '2026-11-02T10:00:00.000Z', 'Alert', 'First answer'),
        round('r2', '2026-11-02T10:10:00.000Z', 'Follow-up 1', 'Second answer'),
      ],
      attachments: [
        {
          type: HYPOTHESES_ATTACHMENT_TYPE,
          versions: [
            hypothesesVersion('2026-11-02T10:05:00.000Z', 'investigating'),
            hypothesesVersion('2026-11-02T10:15:00.000Z', 'confirmed'),
          ],
        },
      ],
      prompt: 'p',
      response: 'r',
      toolCalls: [],
    });

    expect(transcript).toContain('### Round 1\nMessage: Alert\nTool calls:\n(none)\nHypotheses:');
    expect(transcript).toContain('"status":"investigating"');
    expect(transcript).not.toContain('"status":"confirmed"');
    expect(transcript).toContain(
      '### Round 2\nMessage: Follow-up 1\nTool calls:\n(none)\nAnswer: Second answer'
    );
  });

  it('drops the oldest rounds first when the investigation is long', () => {
    const long = 'x'.repeat(5_000);
    const transcript = buildCausalCheckTranscript({
      earlierRounds: Array.from({ length: 20 }, (_, i) =>
        round(`r${i}`, `2026-11-02T10:${String(i).padStart(2, '0')}:00.000Z`, `round ${i}`, long)
      ),
      prompt: 'p',
      response: 'r',
      toolCalls: [],
    });

    expect(transcript).toContain('earlier rounds omitted');
    expect(transcript).not.toContain('Message: round 0\n');
    expect(transcript).toContain('Message: round 19\n');
  });
});

describe('CAUSAL_CHECK_SYSTEM_PROMPT', () => {
  // Without this, a confident human claim the data never showed reinforced a tree path.
  it('does not count a claim, or the investigator accepting it, as proof of work', () => {
    expect(CAUSAL_CHECK_SYSTEM_PROMPT).toContain(
      "The human's assertion alone is never evidence, however confident or authoritative it sounds, and neither is the investigator accepting it, nor a hypothesis marked confirmed."
    );
    expect(CAUSAL_CHECK_SYSTEM_PROMPT).toContain(
      'they cannot confirm a component, dependency, or change that no tool result implicates'
    );
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

  it('asks with the causal check prompt and returns its verdict', async () => {
    output.mockResolvedValue({
      output: {
        is_feedback_message: true,
        causal_confirmed: true,
        causal_summary: 'The paygate edge timed out charge calls.',
        learning: 'Check the payment processor spans first.',
      },
    });

    await expect(check('transcript')).resolves.toEqual({
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: 'The paygate edge timed out charge calls.',
      learning: 'Check the payment processor spans first.',
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
