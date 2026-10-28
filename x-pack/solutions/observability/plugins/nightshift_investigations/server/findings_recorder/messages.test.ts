/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  ToolResultType,
  type ConversationRoundStep,
} from '@kbn/agent-builder-common';
import { MessageRole } from '@kbn/inference-common';
import {
  buildRecorderMessages,
  clippedResultFiles,
  countTurns,
  extractAnswer,
  groupTurns,
  toolNamesToDefine,
  STRUCTURED_OUTPUT_TOOL,
  type RecorderTurn,
} from './messages';
import { FINAL_INSTRUCTION, LIVE_INSTRUCTION } from './prompt';

const reasoning = (group: string, text: string, transient = false): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
  tool_call_group_id: group,
  ...(transient && { transient }),
});

const toolStep = (
  group: string,
  id: string,
  toolId: string,
  params: Record<string, unknown>,
  data: Record<string, unknown>
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_call_group_id: group,
  tool_id: toolId,
  params,
  results: [{ tool_result_id: `r-${id}`, type: ToolResultType.other, data }],
});

// Two agent turns: the first writes a note and calls two tools in parallel, the second calls one.
const steps: ConversationRoundStep[] = [
  reasoning('g1', 'Checking error rates.'),
  toolStep('g1', 'c1', 'nightshift_sandbox_bash', { command: 'curl a' }, { stdout: 'rate: 3%' }),
  toolStep(
    'g1',
    'c2',
    'nightshift_sandbox_view_file',
    { file_path: '/workspace/x' },
    { text: 'file' }
  ),
  toolStep('g2', 'c3', 'nightshift_sandbox_bash', { command: 'curl b' }, { stdout: 'rate: 9%' }),
];

const roles = (messages: ReturnType<typeof buildRecorderMessages>) => messages.map((m) => m.role);

describe('groupTurns', () => {
  it('makes one turn per tool call group, with its text and parallel calls', () => {
    const turns = groupTurns(steps);

    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe('Checking error rates.');
    expect(turns[0].calls.map((c) => c.tool_call_id)).toEqual(['c1', 'c2']);
    expect(turns[1].text).toBeUndefined();
    expect(turns[1].calls.map((c) => c.tool_call_id)).toEqual(['c3']);
  });

  it('ignores transient reasoning and counts the turns', () => {
    expect(countTurns([reasoning('g0', 'thinking', true), ...steps])).toBe(2);
  });
});

describe('buildRecorderMessages', () => {
  it('lays the conversation out like the agent saw it, then asks for the record', () => {
    const messages = buildRecorderMessages({
      question: 'Why is checkout failing?',
      steps,
      turns: [],
      final: false,
    });

    expect(roles(messages)).toEqual([
      MessageRole.User, // the human message
      MessageRole.Assistant, // turn 1 with two tool calls
      MessageRole.Tool,
      MessageRole.Tool,
      MessageRole.Assistant, // turn 2
      MessageRole.Tool,
      MessageRole.User, // the recorder's instruction
    ]);
    expect(messages[0]).toMatchObject({ content: 'Why is checkout failing?' });
    expect(messages[1]).toMatchObject({
      content: 'Checking error rates.',
      toolCalls: [
        {
          toolCallId: 'c1',
          function: { name: 'nightshift_sandbox_bash', arguments: { command: 'curl a' } },
        },
        { toolCallId: 'c2', function: { name: 'nightshift_sandbox_view_file' } },
      ],
    });
    expect(messages[2]).toMatchObject({ toolCallId: 'c1', response: 'rate: 3%' });
    expect(messages.at(-1)).toMatchObject({ content: LIVE_INSTRUCTION });
  });

  it('asks the final question once the agent has finished', () => {
    const messages = buildRecorderMessages({ steps, turns: [], final: true });

    expect(messages.at(-1)).toMatchObject({ content: FINAL_INSTRUCTION });
  });

  it('puts notices about what people did just before the instruction', () => {
    const messages = buildRecorderMessages({
      steps,
      turns: [],
      final: false,
      notices: ['Jane (a human) changed the investigation severity to "low".'],
    });

    expect(messages.at(-2)).toMatchObject({ content: expect.stringContaining('Jane (a human)') });
    expect(messages.at(-1)).toMatchObject({ content: LIVE_INSTRUCTION });
  });

  it("gives the final pass the agent's final message, just before the instruction", () => {
    const messages = buildRecorderMessages({
      steps,
      turns: [],
      final: true,
      answer: 'Severity: medium. The deploy doubled DB latency.',
    });

    expect(messages.at(-2)).toEqual({
      role: 'assistant',
      content: 'Severity: medium. The deploy doubled DB latency.',
    });
    expect(messages.at(-1)).toMatchObject({ content: FINAL_INSTRUCTION });
  });

  it('does not add the final message to a live pass', () => {
    const messages = buildRecorderMessages({ steps, turns: [], final: false, answer: 'x' });

    expect(
      messages.some((message) => message.role === MessageRole.Assistant && message.content === 'x')
    ).toBe(false);
  });

  it('slots an earlier recorder answer in after the agent turns that preceded it', () => {
    const earlier: RecorderTurn = {
      atGroups: 1,
      final: false,
      answer: { summary: 'early', hypotheses: [] },
    };

    const messages = buildRecorderMessages({
      question: 'q',
      steps,
      turns: [earlier],
      final: false,
    });

    expect(roles(messages)).toEqual([
      MessageRole.User,
      MessageRole.Assistant, // agent turn 1
      MessageRole.Tool,
      MessageRole.Tool,
      MessageRole.User, // the first recorder question
      MessageRole.Assistant, // its structured answer
      MessageRole.Tool,
      MessageRole.Assistant, // agent turn 2, which came after
      MessageRole.Tool,
      MessageRole.User, // the new question
    ]);
    expect(messages[4]).toMatchObject({ content: LIVE_INSTRUCTION });
    expect(messages[5]).toMatchObject({
      toolCalls: [{ function: { name: STRUCTURED_OUTPUT_TOOL, arguments: { summary: 'early' } } }],
    });
    expect(messages[6]).toMatchObject({ name: STRUCTURED_OUTPUT_TOOL, response: 'Recorded.' });
  });

  it('only ever grows at the end, so each pass starts with the previous one', () => {
    const first = buildRecorderMessages({
      question: 'q',
      steps: steps.slice(0, 3),
      turns: [],
      final: false,
    });
    const earlier: RecorderTurn = {
      atGroups: 1,
      final: false,
      answer: { summary: 's', hypotheses: [] },
    };
    const second = buildRecorderMessages({ question: 'q', steps, turns: [earlier], final: false });

    // Everything but the closing question of the first pass reappears, in order, in the second.
    expect(second.slice(0, first.length - 1)).toEqual(first.slice(0, first.length - 1));
  });

  it('clips long tool results and fills in a missing result', () => {
    const long = toolStep('g9', 'c9', 'nightshift_sandbox_bash', {}, { stdout: 'x'.repeat(5000) });
    const interrupted: ConversationRoundStep = {
      ...toolStep('g10', 'c10', 'nightshift_sandbox_bash', {}, {}),
      results: [],
    } as ConversationRoundStep;

    const messages = buildRecorderMessages({ steps: [long, interrupted], turns: [], final: false });

    const tools = messages.filter((m) => m.role === MessageRole.Tool);
    expect((tools[0] as { response: string }).response).toContain('more characters');
    expect((tools[0] as { response: string }).response.length).toBeLessThan(1700);
    expect(tools[1]).toMatchObject({ response: '(no result)' });
  });
});

describe('toolNamesToDefine', () => {
  it('always lists the investigator tools, so the list is the same on every pass', () => {
    const early = toolNamesToDefine(
      buildRecorderMessages({ steps: steps.slice(0, 2), turns: [], final: false })
    );
    const late = toolNamesToDefine(buildRecorderMessages({ steps, turns: [], final: true }));

    expect(early).toEqual(late);
    expect(early).toEqual(
      expect.arrayContaining(['nightshift_sandbox_bash', 'nightshift_time_converter_tool'])
    );
    expect(early).not.toContain(STRUCTURED_OUTPUT_TOOL);
    expect([...early].sort()).toEqual(early);
  });

  it('adds a tool it has not heard of, after sorting', () => {
    const odd = toolStep('g7', 'c7', 'some_other_tool', {}, { text: 'x' });

    const names = toolNamesToDefine(
      buildRecorderMessages({ steps: [odd], turns: [], final: false })
    );

    expect(names).toContain('some_other_tool');
  });
});

describe('extractAnswer', () => {
  it("is the round's response message", () => {
    expect(extractAnswer({ responseMessage: 'Root cause: bad deploy' })).toBe(
      'Root cause: bad deploy'
    );
  });

  it('is nothing when the round has no response', () => {
    expect(extractAnswer({})).toBeUndefined();
    expect(extractAnswer({ responseMessage: '' })).toBeUndefined();
  });
});

describe('clipped tool results', () => {
  const long = 'row\n'.repeat(1_000);
  const withLong: ConversationRoundStep[] = [
    toolStep('g1', 'c1', 'nightshift_sandbox_bash', { command: 'curl a' }, { stdout: 'short' }),
    toolStep('g2', 'c2', 'nightshift_sandbox_bash', { command: 'curl b' }, { stdout: long }),
  ];

  it('lists only the results too long to be replayed, with a stable path each', () => {
    expect(clippedResultFiles(withLong)).toEqual([
      {
        toolCallId: 'c2',
        path: '/workspace/.recorder/results/002-nightshift_sandbox_bash.txt',
        content: long,
      },
    ]);
    expect(clippedResultFiles([])).toEqual([]);
  });

  it('points a clipped result at its file, and leaves a short one alone', () => {
    const messages = buildRecorderMessages({
      steps: withLong,
      turns: [],
      final: true,
      answer: 'Done.',
      resultPaths: new Map([
        ['c2', '/workspace/.recorder/results/002-nightshift_sandbox_bash.txt'],
      ]),
    });
    const responses = messages.filter((m) => m.role === MessageRole.Tool).map((m) => m.response);
    expect(responses[0]).toBe('short');
    expect(responses[1]).toContain(
      'full output in /workspace/.recorder/results/002-nightshift_sandbox_bash.txt'
    );
  });

  it('clips without a path when none was written', () => {
    const messages = buildRecorderMessages({ steps: withLong, turns: [], final: false });
    const last = messages.filter((m) => m.role === MessageRole.Tool).pop();
    expect(last?.response).toContain('more characters]');
    expect(JSON.stringify(last?.response)).not.toContain('full output in');
  });
});
