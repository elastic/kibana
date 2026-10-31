/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_AUTO_CONFIRM_ROUNDS,
  PersonaMatrixChatClient,
  UNANSWERED_PROMPT_MARKER,
} from './chat_client';

const confirmation = (id: string) => ({ id, type: 'confirmation', title: 'Run preview?' });
const askUser = (id: string, question: string) => ({
  id,
  type: 'ask_user_question',
  questions: [{ question, options: [], multi_select: false }],
});

const preview = {
  type: 'tool_call',
  tool_id: 'security.run_rule_preview',
  tool_call_id: 'tc1',
};

const bodyOf = (fetch: jest.Mock, call: number) => JSON.parse(fetch.mock.calls[call][0].body);

const createClient = (fetch: jest.Mock) =>
  new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'connector-1');

describe('PersonaMatrixChatClient HITL prompts', () => {
  it('returns a plain answer with one POST and no errors', async () => {
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'c1',
      response: { message: 'done' },
      steps: [{ type: 'tool_call', tool_id: 'a' }],
    });

    const result = await createClient(fetch).query('q');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.messages).toEqual([{ message: 'done' }]);
    expect(result.errors).toEqual([]);
  });

  it('allows a confirmation prompt, continues the conversation, and returns the final answer', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        trace_id: 't1',
        response: { message: '', prompts: [confirmation('p1'), confirmation('p2')] },
        steps: [preview],
      })
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: 'Preview found 0 alerts.' },
        // A resume response is the folded round: it repeats the steps of the earlier execution
        // (same tool_call_id) and appends the new ones.
        steps: [
          preview,
          { type: 'tool_call', tool_id: 'platform.core.search', tool_call_id: 'tc2' },
        ],
      });

    const result = await createClient(fetch).query('q');

    expect(fetch).toHaveBeenCalledTimes(2);
    // both confirmations are batched in one continuation POST on the same conversation
    expect(bodyOf(fetch, 1)).toMatchObject({
      conversation_id: 'c1',
      connector_id: 'connector-1',
      prompts: { p1: { allow: true }, p2: { allow: true } },
    });
    expect(bodyOf(fetch, 1).input).toBeUndefined();
    expect(result.messages).toEqual([{ message: 'Preview found 0 alerts.' }]);
    // cumulative continuation steps replace, never stack: each tool_call_id appears once
    expect(result.steps.map((s: { tool_call_id?: string }) => s.tool_call_id)).toEqual([
      'tc1',
      'tc2',
    ]);
    expect(result.errors).toEqual([]);
    expect(result.conversationId).toBe('c1');
    expect(result.traceId).toBe('t1');
  });

  it('does not duplicate steps across several continuation rounds', async () => {
    const s2 = { type: 'tool_call', tool_id: 'platform.core.search', tool_call_id: 'tc2' };
    const s3 = { type: 'tool_call', tool_id: 'security.run_rule_preview', tool_call_id: 'tc3' };
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: '', prompts: [confirmation('p1')] },
        steps: [preview],
      })
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: '', prompts: [confirmation('p2')] },
        steps: [preview, s2],
      })
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: 'done' },
        steps: [preview, s2, s3],
      });

    const result = await createClient(fetch).query('q');

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.steps).toEqual([preview, s2, s3]);
  });

  it('throws once the confirmation chain exceeds the cap', async () => {
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'c1',
      response: { message: '', prompts: [confirmation('p1')] },
    });

    await expect(createClient(fetch).query('q')).rejects.toThrow(/exceeded 3 auto-confirm/);
    // 1 initial POST + MAX_AUTO_CONFIRM_ROUNDS continuations (withRetry does not retry this error)
    expect(fetch).toHaveBeenCalledTimes(1 + MAX_AUTO_CONFIRM_ROUNDS);
  });

  it('marks a round paused on ask_user_question instead of scoring an empty answer', async () => {
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'c1',
      response: { message: '', prompts: [askUser('q1', 'Which hunt do you mean?')] },
    });

    const result = await createClient(fetch).query('q');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.messages[0].message).toBe(
      `${UNANSWERED_PROMPT_MARKER} Agent paused on a ask_user_question prompt: Which hunt do you mean?`
    );
    expect(result.errors).toEqual([
      {
        type: 'unanswered_prompt',
        error: {
          message: 'Agent paused on a ask_user_question prompt: Which hunt do you mean?',
        },
      },
    ]);
  });

  it('keeps the model text and still records the error when a paused round has a message', async () => {
    const fetch = jest.fn().mockResolvedValue({
      response: { message: 'I need one detail.', prompts: [askUser('q1', 'Which host?')] },
    });

    const result = await createClient(fetch).query('q');

    expect(result.messages[0].message).toBe('I need one detail.');
    expect(result.errors.map((e) => e.type)).toEqual(['unanswered_prompt']);
  });

  it('confirms first, then marks a later ask_user_question', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: '', prompts: [confirmation('p1')] },
      })
      .mockResolvedValueOnce({
        conversation_id: 'c1',
        response: { message: '', prompts: [askUser('q1', 'Duplicate the case?')] },
      });

    const result = await createClient(fetch).query('q');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.messages[0].message).toContain(UNANSWERED_PROMPT_MARKER);
    expect(result.messages[0].message).toContain('Duplicate the case?');
  });
});
