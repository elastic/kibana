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
import { buildDigest, extractAnswer } from './digest';

let nextId = 0;

const toolStep = (
  toolId: string,
  params: Record<string, unknown>,
  data: Record<string, unknown>
): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: `call-${++nextId}`,
  tool_id: toolId,
  params,
  results: [{ tool_result_id: `result-${nextId}`, type: ToolResultType.other, data }],
});

const reasoningStep = (reasoning: string, transient = false): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning,
  ...(transient && { transient }),
});

describe('buildDigest', () => {
  it('renders reasoning and tool calls with a clipped result', () => {
    const digest = buildDigest({
      steps: [
        reasoningStep('Checking error rates by service.'),
        toolStep(
          'nightshift_sandbox_bash',
          { command: 'curl $URL/_query' },
          { stdout: 'x'.repeat(2000) }
        ),
      ],
    });

    expect(digest).toContain('Agent: Checking error rates by service.');
    expect(digest).toContain('Tool nightshift_sandbox_bash: curl $URL/_query');
    expect(digest).toContain('…');
    expect(digest.length).toBeLessThan(1000);
  });

  it('skips transient reasoning, the final reply, time conversions and seeded knowledge reads', () => {
    const digest = buildDigest({
      steps: [
        reasoningStep('thinking', true),
        toolStep('reply_user', { response: 'Root cause: bad deploy' }, { response: 'x' }),
        toolStep('time_converter_tool', { time_input: 'now' }, { text: 'Epoch seconds: 1' }),
        toolStep(
          'nightshift_sandbox_view_file',
          { file_path: '/workspace/elastic.md' },
          { text: 'docs' }
        ),
        toolStep('nightshift_sandbox_bash', { command: 'ls' }, { stdout: 'a' }),
      ],
    });

    expect(digest).not.toContain('thinking');
    expect(digest).not.toContain('reply_user');
    expect(digest).not.toContain('time_converter_tool');
    expect(digest).not.toContain('elastic.md');
    expect(digest).toContain('Tool nightshift_sandbox_bash: ls');
  });

  it('keeps the newest steps within the budget and says how many it left out', () => {
    const steps = Array.from({ length: 10 }, (_, index) =>
      reasoningStep(`step ${index} ${'y'.repeat(40)}`)
    );

    const digest = buildDigest({ steps, maxChars: 150 });

    expect(digest).toContain('earlier steps omitted');
    expect(digest).toContain('step 9');
    expect(digest).not.toContain('step 0 ');
  });
});

describe('extractAnswer', () => {
  it('prefers the last reply_user response over the closing message', () => {
    const answer = extractAnswer({
      steps: [
        toolStep('reply_user', { response: 'first' }, {}),
        toolStep('reply_user', { response: 'Root cause: bad deploy' }, {}),
      ],
      responseMessage: 'Done.',
    });

    expect(answer).toBe('Root cause: bad deploy');
  });

  it('falls back to the round response, and to nothing', () => {
    expect(extractAnswer({ steps: [], responseMessage: 'Done.' })).toBe('Done.');
    expect(extractAnswer({ steps: [] })).toBeUndefined();
  });
});
