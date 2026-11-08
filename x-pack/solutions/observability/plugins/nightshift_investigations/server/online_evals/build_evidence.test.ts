/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import { buildOnlineEvalsEvidence, MAX_EVIDENCE_TOOL_CALLS } from './build_evidence';

const toolCall = (id: string) => ({
  type: 'tool_call',
  tool_call_id: id,
  tool_id: 'nightshift_sandbox_bash',
  params: { command: `echo ${id}` },
  results: [{ type: 'other', data: { stdout: id } }],
});

const round = (steps: unknown[]): ConversationRound =>
  ({
    id: 'round-1',
    input: { message: 'Why did the checkout alert fire?' },
    response: { message: 'A bad deploy of the payments service.' },
    steps,
  } as unknown as ConversationRound);

describe('buildOnlineEvalsEvidence', () => {
  it("takes the round's input, tool calls and final response, skipping other steps", () => {
    expect(
      buildOnlineEvalsEvidence({
        round: round([{ type: 'update_todos' }, toolCall('call-1')]),
      })
    ).toEqual({
      round: {
        input: { message: 'Why did the checkout alert fire?' },
        steps: [
          {
            tool_call_id: 'call-1',
            tool_id: 'nightshift_sandbox_bash',
            arguments: { command: 'echo call-1' },
            result: [{ type: 'other', data: { stdout: 'call-1' } }],
          },
        ],
        response: { message: 'A bad deploy of the payments service.' },
      },
    });
  });

  describe('reasoning notes', () => {
    it('attaches an unbound note to the tool call that follows it', () => {
      const { steps } = buildOnlineEvalsEvidence({
        round: round([
          { type: 'reasoning', reasoning: 'Checking pods' },
          { type: 'reasoning', reasoning: '  Comparing error rates  ' },
          toolCall('call-1'),
          toolCall('call-2'),
        ]),
      }).round;

      expect(steps[0].reasoning).toBe('Checking pods\nComparing error rates');
      expect(steps[1]).not.toHaveProperty('reasoning');
    });

    it('attaches a note bound to a call id to that call, wherever it sits', () => {
      const { steps } = buildOnlineEvalsEvidence({
        round: round([
          toolCall('call-1'),
          { type: 'reasoning', reasoning: 'Reading the runbook', tool_call_id: 'call-1' },
          toolCall('call-2'),
        ]),
      }).round;

      expect(steps[0].reasoning).toBe('Reading the runbook');
      expect(steps[1]).not.toHaveProperty('reasoning');
    });

    it('drops blank notes and a note with no call after it', () => {
      const { steps } = buildOnlineEvalsEvidence({
        round: round([
          { type: 'reasoning', reasoning: '   ' },
          toolCall('call-1'),
          { type: 'reasoning', reasoning: 'Wrapping up' },
        ]),
      }).round;

      expect(steps).toHaveLength(1);
      expect(steps[0]).not.toHaveProperty('reasoning');
    });
  });

  it('passes the alert outcome as the ground truth, apart from the graded round', () => {
    const evidence = buildOnlineEvalsEvidence({
      round: round([toolCall('call-1')]),
      alertOutcome: 'Confirmed: rolling back the payments deploy cleared the alert.',
    });

    expect(evidence.reference_data).toEqual({
      alert_outcome: 'Confirmed: rolling back the payments deploy cleared the alert.',
    });
    expect(evidence.round.response.message).toBe('A bad deploy of the payments service.');
  });

  it('keeps the earliest tool calls when there are more than evaluate() accepts', () => {
    const calls = Array.from({ length: MAX_EVIDENCE_TOOL_CALLS + 5 }, (_, index) =>
      toolCall(`call-${index}`)
    );

    const { steps, response } = buildOnlineEvalsEvidence({ round: round(calls) }).round;

    expect(steps).toHaveLength(MAX_EVIDENCE_TOOL_CALLS);
    expect(steps[0].tool_call_id).toBe('call-0');
    expect(steps[MAX_EVIDENCE_TOOL_CALLS - 1].tool_call_id).toBe(
      `call-${MAX_EVIDENCE_TOOL_CALLS - 1}`
    );
    expect(response.message).toBe('A bad deploy of the payments service.');
  });
});
