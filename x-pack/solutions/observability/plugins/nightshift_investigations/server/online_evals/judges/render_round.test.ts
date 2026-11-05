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

  it('truncates long tool results', () => {
    const transcript = renderRound({
      input: { message: 'q' },
      steps: [{ tool_id: 'search', arguments: {}, result: 'x'.repeat(MAX_TOOL_FIELD_CHARS + 50) }],
      response: { message: 'a' },
    });

    expect(transcript).toContain(`${'x'.repeat(MAX_TOOL_FIELD_CHARS)}\n[truncated 50 characters]`);
    expect(transcript).not.toContain('x'.repeat(MAX_TOOL_FIELD_CHARS + 1));
  });

  it('omits tool calls past the budget but always keeps the answer', () => {
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
    expect(transcript).toContain(
      `[${steps.length - renderedCalls} more tool calls omitted to fit the judge's context]`
    );
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
