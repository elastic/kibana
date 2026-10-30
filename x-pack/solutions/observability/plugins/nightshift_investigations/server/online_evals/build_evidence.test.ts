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
        round: round([{ type: 'reasoning', reasoning: 'Checking pods' }, toolCall('call-1')]),
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

  it('keeps the latest tool calls when there are more than evaluate() accepts', () => {
    const calls = Array.from({ length: MAX_EVIDENCE_TOOL_CALLS + 5 }, (_, index) =>
      toolCall(`call-${index}`)
    );

    const { steps } = buildOnlineEvalsEvidence({ round: round(calls) }).round;

    expect(steps).toHaveLength(MAX_EVIDENCE_TOOL_CALLS);
    expect(steps[0].tool_call_id).toBe('call-5');
  });
});
