/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import {
  MAX_HISTORY_RESULT_CHARS,
  buildInvestigationConversation,
  buildInvestigationRound,
} from './investigation_round';

const esqlResult = (stdout: string) => [
  { tool_result_id: 'r-1', type: ToolResultType.other, data: { stdout, exit_code: 0 } },
];

const build = (toolCalls: Parameters<typeof buildInvestigationRound>[0]['toolCalls']) =>
  buildInvestigationRound({
    roundId: 'round-1',
    prompt: 'Why is checkout slow?',
    response: 'Connection pool exhausted.',
    toolCalls,
    startedAt: '2026-09-30T02:28:30.000Z',
  });

describe('buildInvestigationRound', () => {
  it('keeps the prompt, the final answer, and each call with its result', () => {
    const results = esqlResult('{"values":[[52794,"ERROR"]]}');
    const round = build([
      {
        tool_id: SANDBOX_BASH_TOOL_ID,
        tool_call_id: 'toolu_1',
        params: { command: 'curl "$URL/_query"' },
        results,
      },
    ]);

    expect(round.input.message).toBe('Why is checkout slow?');
    expect(round.response.message).toBe('Connection pool exhausted.');
    expect(round.steps).toEqual([
      {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'toolu_1',
        tool_id: SANDBOX_BASH_TOOL_ID,
        params: { command: 'curl "$URL/_query"' },
        results,
      },
    ]);
  });

  // A tool call without a paired result message is rejected by the provider.
  it('marks a call with no known results as interrupted so it still gets a result', () => {
    const [step] = build([
      { tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', params: {} },
    ]).steps;

    expect(step).toMatchObject({ results: [], interrupted: true });
  });

  it('gives a call without an id a stable synthetic one', () => {
    const [step] = build([{ tool_id: SANDBOX_BASH_TOOL_ID, params: {}, results: [] }]).steps;

    expect(step).toMatchObject({ tool_call_id: 'investigation-call-0' });
  });

  it('omits the content of Cortex and decision-tree files Nightshift seeded', () => {
    const [seeded, other] = build([
      {
        tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
        tool_call_id: 'toolu_1',
        params: { file_path: '/workspace/decision-trees/monitors.md' },
        results: esqlResult('index body'),
      },
      {
        tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
        tool_call_id: 'toolu_2',
        params: { file_path: '/workspace/notes.txt' },
        results: esqlResult('notes body'),
      },
    ]).steps;

    expect(JSON.stringify(seeded)).not.toContain('index body');
    expect(seeded).toMatchObject({
      params: { file_path: '/workspace/decision-trees/monitors.md' },
      results: [{ data: { omitted: expect.any(String) } }],
    });
    expect(JSON.stringify(other)).toContain('notes body');
  });

  it('replaces results past the transcript budget while keeping every call', () => {
    const half = 'x'.repeat(MAX_HISTORY_RESULT_CHARS / 2);
    const steps = build(
      ['toolu_1', 'toolu_2', 'toolu_3'].map((id) => ({
        tool_id: SANDBOX_BASH_TOOL_ID,
        tool_call_id: id,
        params: {},
        results: esqlResult(half),
      }))
    ).steps;

    expect(steps).toHaveLength(3);
    expect(JSON.stringify(steps[0])).toContain(half);
    expect(steps[2]).toMatchObject({ results: [{ data: { omitted: expect.any(String) } }] });
  });
});

describe('buildInvestigationConversation', () => {
  it('holds only the investigator round, owned by the reinforcement agent', () => {
    const round = build([]);
    const conversation = buildInvestigationConversation({
      conversationId: 'conv-1',
      agentId: 'significant-events.decision-tree-reinforcement',
      round,
      now: '2026-09-30T02:32:00.000Z',
    });

    expect(conversation).toMatchObject({
      id: 'conv-1',
      agent_id: 'significant-events.decision-tree-reinforcement',
      rounds: [round],
    });
    // No events: Agent Builder then rebuilds the history from `rounds`.
    expect(conversation.events).toBeUndefined();
  });
});
