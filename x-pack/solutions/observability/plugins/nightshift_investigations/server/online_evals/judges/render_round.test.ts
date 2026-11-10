/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_TOOL_CALLS_CHARS,
  MAX_TOOL_FIELD_CHARS,
  renderRound,
  renderTraceMessages,
  roundEvidenceSchema,
} from './render_round';

describe('renderRound', () => {
  it('renders the input, each tool call with its arguments and result, and the answer in order', () => {
    const transcript = renderRound({
      input: { message: 'Investigate the checkout latency alert' },
      steps: [
        {
          tool_id: 'platform.core.search',
          arguments: { index: 'logs-*', query: 'service:checkout' },
          result: { hits: 3 },
        },
        { tool_id: 'set_hypotheses', arguments: { hypotheses: ['bad deploy'] }, result: 'ok' },
      ],
      response: { message: 'The 14:02 deploy of checkout caused the latency.' },
    });

    expect(transcript).toBe(
      [
        '## User\nInvestigate the checkout latency alert',
        '## Tool call 1: platform.core.search\nArguments:\n{"index":"logs-*","query":"service:checkout"}\nResult:\n{"hits":3}',
        '## Tool call 2: set_hypotheses\nArguments:\n{"hypotheses":["bad deploy"]}\nResult:\nok',
        '## Agent final answer\nThe 14:02 deploy of checkout caused the latency.',
      ].join('\n\n')
    );
  });

  it('renders the hypotheses panel under the final answer', () => {
    const transcript = renderRound(
      { input: { message: 'q' }, steps: [], response: { message: 'final answer' } },
      [{ candidate: 'Bad deploy', status: 'confirmed', confidence: 0.9 }]
    );

    expect(
      transcript.endsWith(
        '## Agent final answer\nfinal answer\n\n## Hypotheses panel (shown to the user)\n- [confirmed] Bad deploy (confidence 0.9)'
      )
    ).toBe(true);
  });

  it('truncates long tool results', () => {
    const transcript = renderRound({
      input: { message: 'q' },
      steps: [{ tool_id: 'search', arguments: {}, result: 'x'.repeat(MAX_TOOL_FIELD_CHARS + 50) }],
      response: { message: 'a' },
    });

    expect(transcript).toContain(`${'x'.repeat(MAX_TOOL_FIELD_CHARS)}\n[truncated 50 characters]`);
    expect(transcript).not.toContain('x'.repeat(MAX_TOOL_FIELD_CHARS + 1));
  });

  it('omits tool calls from the middle past the budget but always keeps both ends and the answer', () => {
    const steps = Array.from({ length: 100 }, () => ({
      tool_id: 'search',
      result: 'y'.repeat(MAX_TOOL_FIELD_CHARS),
    }));
    const transcript = renderRound({
      input: { message: 'q' },
      steps,
      response: { message: 'final answer' },
    });

    const renderedCalls = transcript.match(/## Tool call/g)?.length ?? 0;
    expect(renderedCalls).toBeLessThan(steps.length);
    expect(transcript.length).toBeLessThan(MAX_TOOL_CALLS_CHARS + 2 * MAX_TOOL_FIELD_CHARS);
    const marker = `[${
      steps.length - renderedCalls
    } tool calls omitted here to fit the judge's context]`;
    expect(transcript.indexOf('## Tool call 1: ')).toBeLessThan(transcript.indexOf(marker));
    expect(transcript.indexOf(marker)).toBeLessThan(transcript.indexOf('## Tool call 100: '));
    expect(transcript.endsWith('## Agent final answer\nfinal answer')).toBe(true);
  });
});

describe('roundEvidenceSchema', () => {
  it('requires a user input and a final answer', () => {
    expect(
      roundEvidenceSchema.safeParse({ input: { message: 'q' }, response: { message: 'a' } }).success
    ).toBe(true);
    expect(
      roundEvidenceSchema.safeParse({ input: { message: 'q' }, response: { message: '  ' } })
        .success
    ).toBe(false);
    expect(
      roundEvidenceSchema.safeParse({ input: { message: '' }, response: { message: 'a' } }).success
    ).toBe(false);
  });
});

describe('renderTraceMessages', () => {
  it('leaves out the final answer when asked', () => {
    const { messages } = renderTraceMessages(
      {
        input: { message: 'q' },
        steps: [{ tool_id: 'search', arguments: {}, result: 'r' }],
        response: { message: 'final answer' },
      },
      { includeFinalAnswer: false }
    );

    expect(messages.map(({ role }) => role)).toEqual(['user', 'assistant', 'tool']);
    expect(JSON.stringify(messages)).not.toContain('final answer');
  });

  it('renders tool calls as assistant and tool messages between the input and the answer', () => {
    const { messages, omittedToolCalls } = renderTraceMessages({
      input: { message: 'Why is checkout slow?' },
      steps: [
        {
          tool_call_id: 'toolu_01/with:odd chars',
          tool_id: 'platform.core.search',
          reasoning: 'Searching the checkout logs.',
          arguments: { q: 'x' },
          result: { hits: 2 },
        },
        { tool_id: 'other', arguments: 'raw', result: undefined },
      ],
      response: { message: 'The deploy.' },
    });

    expect(omittedToolCalls).toBe(0);
    expect(messages).toEqual([
      { role: 'user', content: 'Why is checkout slow?' },
      {
        role: 'assistant',
        content: 'Searching the checkout logs.',
        toolCalls: [
          {
            toolCallId: 'call_1',
            function: { name: 'platform_core_search', arguments: { q: 'x' } },
          },
        ],
      },
      {
        role: 'tool',
        name: 'platform_core_search',
        toolCallId: 'call_1',
        response: { result: '{"hits":2}' },
      },
      {
        role: 'assistant',
        content: null,
        toolCalls: [
          { toolCallId: 'call_2', function: { name: 'other', arguments: { value: 'raw' } } },
        ],
      },
      { role: 'tool', name: 'other', toolCallId: 'call_2', response: { result: '(empty)' } },
      { role: 'assistant', content: 'The deploy.' },
    ]);
  });

  it('truncates large results and arguments', () => {
    const { messages } = renderTraceMessages({
      input: { message: 'q' },
      steps: [
        {
          tool_id: 'search',
          arguments: { q: 'x'.repeat(MAX_TOOL_FIELD_CHARS + 50) },
          result: 'y'.repeat(MAX_TOOL_FIELD_CHARS + 50),
        },
      ],
      response: { message: 'a' },
    });

    const [, call, result] = messages as Array<{
      toolCalls?: any[];
      response?: { result: string };
    }>;
    expect(call.toolCalls![0].function.arguments.arguments).toContain('[truncated');
    expect(result.response!.result).toContain('[truncated 50 characters]');
  });

  it('keeps the first and last tool calls and counts those left out from the middle', () => {
    const steps = Array.from({ length: 80 }, (_, index) => ({
      tool_id: 'search',
      arguments: { index },
      result: 'z'.repeat(MAX_TOOL_FIELD_CHARS),
    }));

    const { messages, omittedToolCalls } = renderTraceMessages({
      input: { message: 'q' },
      steps,
      response: { message: 'a' },
    });

    expect(omittedToolCalls).toBeGreaterThan(0);
    expect(messages).toHaveLength(1 + (80 - omittedToolCalls) * 2 + 1);
    expect(messages[2]).toEqual(expect.objectContaining({ toolCallId: 'call_1' }));
    expect(messages[messages.length - 2]).toEqual(
      expect.objectContaining({ toolCallId: 'call_80' })
    );
    expect(messages[messages.length - 1]).toEqual({ role: 'assistant', content: 'a' });
  });
});
