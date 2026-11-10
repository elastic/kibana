/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import {
  buildOnlineEvalsEvidence,
  extractHypotheses,
  MAX_EVIDENCE_TOOL_CALLS,
} from './build_evidence';

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

    it('drops blank notes and passes the notes after the last call as the closing reasoning', () => {
      const evidence = buildOnlineEvalsEvidence({
        round: round([
          { type: 'reasoning', reasoning: '   ' },
          toolCall('call-1'),
          { type: 'reasoning', reasoning: 'The pool is exhausted' },
          { type: 'reasoning', reasoning: 'so the deploy is the cause' },
        ]),
        alertOutcome: 'Confirmed: the deploy.',
      });

      expect(evidence.round.steps).toHaveLength(1);
      expect(evidence.round.steps[0]).not.toHaveProperty('reasoning');
      expect(evidence.reference_data).toEqual({
        alert_outcome: 'Confirmed: the deploy.',
        closing_reasoning: 'The pool is exhausted\nso the deploy is the cause',
      });
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

  it('keeps the first and last tool calls when there are more than evaluate() accepts', () => {
    const calls = Array.from({ length: MAX_EVIDENCE_TOOL_CALLS + 5 }, (_, index) =>
      toolCall(`call-${index}`)
    );

    const { steps, response } = buildOnlineEvalsEvidence({ round: round(calls) }).round;

    const ids = steps.map(({ tool_call_id: id }) => id);
    expect(ids).toHaveLength(MAX_EVIDENCE_TOOL_CALLS);
    expect(ids[0]).toBe('call-0');
    expect(ids[ids.length - 1]).toBe(`call-${MAX_EVIDENCE_TOOL_CALLS + 4}`);
    expect(response.message).toBe('A bad deploy of the payments service.');
  });
});

const setHypotheses = (hypotheses: unknown[], extra: Record<string, unknown> = {}) => ({
  type: 'tool_call',
  tool_call_id: 'set-hypotheses',
  tool_id: SET_HYPOTHESES_TOOL_ID,
  params: { hypotheses },
  results: [{ type: 'other', data: {} }],
  ...extra,
});

const deployConfirmed = {
  candidate: 'Bad payments deploy',
  status: 'confirmed',
  confidence: 0.9,
  reason: 'Errors start with the rollout',
};
const dnsDismissed = { candidate: 'DNS outage', status: 'dismissed', confidence: 0.1 };

describe('extractHypotheses', () => {
  it('takes the last call across rounds', () => {
    expect(
      extractHypotheses([
        round([setHypotheses([dnsDismissed])]),
        round([setHypotheses([deployConfirmed, dnsDismissed]), toolCall('call-1')]),
      ])
    ).toEqual([deployConfirmed, dnsDismissed]);
  });

  it('counts a call beyond the tool calls the evidence keeps', () => {
    const calls = Array.from({ length: MAX_EVIDENCE_TOOL_CALLS + 5 }, (_, index) =>
      index === 52 ? setHypotheses([deployConfirmed]) : toolCall(`c${index}`)
    );
    const { steps } = buildOnlineEvalsEvidence({ round: round(calls) }).round;

    expect(steps.some(({ tool_id: toolId }) => toolId === SET_HYPOTHESES_TOOL_ID)).toBe(false);
    expect(extractHypotheses([round(calls)])).toEqual([deployConfirmed]);
  });

  it('skips interrupted and failed calls', () => {
    expect(
      extractHypotheses([
        round([
          setHypotheses([deployConfirmed]),
          setHypotheses([dnsDismissed], { interrupted: true, results: [] }),
          setHypotheses([dnsDismissed], { results: [{ type: 'error', data: { message: 'x' } }] }),
        ]),
      ])
    ).toEqual([deployConfirmed]);
  });

  it('drops malformed entries and the evidence charts', () => {
    expect(
      extractHypotheses([
        round([
          setHypotheses([
            { ...dnsDismissed, evidence: [{ chart: 'latency' }] },
            { candidate: 'No status', confidence: 0.5 },
            { candidate: 'Infinite', status: 'open', confidence: Infinity },
            'not an object',
          ]),
        ]),
      ])
    ).toEqual([dnsDismissed]);
  });

  it('returns undefined without a call or with an empty panel', () => {
    expect(extractHypotheses([round([toolCall('call-1')])])).toBeUndefined();
    expect(extractHypotheses([round([setHypotheses([])])])).toBeUndefined();
  });

  it('passes the hypotheses next to the alert outcome on a recovery', () => {
    expect(
      buildOnlineEvalsEvidence({
        round: round([toolCall('call-1')]),
        alertOutcome: 'Recovered after the rollback.',
        hypotheses: [deployConfirmed],
      }).reference_data
    ).toEqual({ alert_outcome: 'Recovered after the rollback.', hypotheses: [deployConfirmed] });
  });
});
