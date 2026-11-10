/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_AUTO_CONFIRM_ROUNDS,
  PersonaMatrixChatClient,
  RAW_RESPONSE_MAX_CHARS,
  UNANSWERED_PROMPT_MARKER,
} from './chat_client';

describe('PersonaMatrixChatClient rawResponse', () => {
  const queryWith = (response: Record<string, unknown>) => {
    const fetch = jest.fn().mockResolvedValue({ response, steps: [] });
    const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c1');
    return client.query('q');
  };

  it('keeps the final converse response body verbatim when it is small', async () => {
    const result = await queryWith({ message: 'done', extra: 1 });
    expect(JSON.parse(result.rawResponse)).toEqual({ message: 'done', extra: 1 });
  });

  it('bounds an oversized response body and marks the truncation', async () => {
    const result = await queryWith({ message: 'x'.repeat(RAW_RESPONSE_MAX_CHARS * 2) });
    expect(result.rawResponse.length).toBeLessThan(RAW_RESPONSE_MAX_CHARS + 100);
    expect(result.rawResponse).toContain('[truncated');
  });

  it('records the last response when confirmations are continued', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({
        conversation_id: 'c',
        response: { message: '', prompts: [{ id: 'p1', type: 'confirmation' }] },
        steps: [],
      })
      .mockResolvedValueOnce({ conversation_id: 'c', response: { message: 'after' }, steps: [] });
    const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c1');
    const result = await client.query('q');
    expect(JSON.parse(result.rawResponse)).toEqual({ message: 'after' });
  });
});

describe('PersonaMatrixChatClient provenance', () => {
  it('persists null sampling controls and hashes tool_id + params, not provider call ids', async () => {
    const fetch = jest.fn().mockResolvedValue({
      response: { message: 'done' },
      steps: [
        { type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_A', params: { q: 'x' } },
      ],
    });
    const log = { warning: jest.fn() };
    const client = new PersonaMatrixChatClient(fetch, log as never, 'connector-1');

    const first = await client.query('q');
    fetch.mockResolvedValue({
      response: { message: 'done' },
      steps: [
        { type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_B', params: { q: 'x' } },
      ],
    });
    const second = await client.query('q');

    expect(first.sampling).toEqual({
      connectorId: 'connector-1',
      temperature: null,
      topP: null,
      seed: null,
    });
    expect(first.trajectoryFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(second.trajectoryFingerprint).toBe(first.trajectoryFingerprint);
  });

  it('falls back to the last non-empty assistant step when the response message is blank', async () => {
    // Models that end on a tool call return response.message === "". Without
    // the fallback, judges see an empty answer and the matrix renders
    // "No final answer message captured" (51 cells across all models,
    // observed 2026-09-03). The fallback must take the LAST non-empty
    // assistant reasoning/output step verbatim and disclose its source.
    const fetch = jest.fn().mockResolvedValue({
      response: { message: '' },
      steps: [
        { type: 'reasoning', reasoning: 'I will check the alert first.' },
        { type: 'tool_call', tool_id: 'search', params: { q: 'x' } },
        { type: 'reasoning', reasoning: '   ' }, // blank — must be skipped
        { type: 'output', output: 'The alert is benign.' },
        { type: 'tool_call', tool_id: 'search', params: { q: 'y' } }, // trailing tool call, no closing turn
      ],
    });
    const log = { warning: jest.fn() };
    const client = new PersonaMatrixChatClient(fetch, log as never, 'connector-1');

    const res = await client.query('q');
    expect(res.messages[0].message).toBe('The alert is benign.');
    expect(res.messageSource).toBe('last_assistant_step');
  });

  it('keeps the response message verbatim when present', async () => {
    const fetch = jest.fn().mockResolvedValue({
      response: { message: 'final answer' },
      steps: [{ type: 'output', output: 'not the answer' }],
    });
    const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c');
    const res = await client.query('q');
    expect(res.messages[0].message).toBe('final answer');
    expect(res.messageSource).toBe('response');
  });

  it('leaves the message empty when no assistant step has text either', async () => {
    const fetch = jest.fn().mockResolvedValue({
      response: {},
      steps: [{ type: 'tool_call', tool_id: 'search', params: {} }],
    });
    const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c');
    const res = await client.query('q');
    expect(res.messages[0].message).toBe('');
    expect(res.messageSource).toBe('response');
  });

  describe('workflowAttachments', () => {
    const generateStep = {
      type: 'tool_call',
      tool_id: 'platform.core.generate_workflow',
      params: { query: 'x' },
    };
    const conversation = {
      attachments: [
        { id: 'text-1', type: 'text', current_version: 1, versions: [{ version: 1, data: {} }] },
        {
          id: 'wf-1',
          type: 'workflow.yaml',
          current_version: 2,
          versions: [
            { version: 1, data: { yaml: 'old: yaml' } },
            { version: 2, data: { yaml: 'new: yaml' } },
          ],
        },
      ],
    };

    it('reads the current version of workflow.yaml attachments after a workflow-authoring call', async () => {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce({
          conversation_id: 'conv-1',
          response: { message: 'ok' },
          steps: [generateStep],
        })
        .mockResolvedValueOnce(conversation);
      const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c');

      const res = await client.query('q');

      expect(fetch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          path: '/api/agent_builder/conversations/conv-1',
          method: 'GET',
        })
      );
      expect(res.workflowAttachments).toEqual([{ id: 'wf-1', version: 2, yaml: 'new: yaml' }]);
    });

    it('encodes the conversation id as a single path segment', async () => {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce({
          conversation_id: '../agents/x',
          response: { message: 'ok' },
          steps: [generateStep],
        })
        .mockResolvedValueOnce(conversation);
      const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c');

      await client.query('q');

      expect(fetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ path: '/api/agent_builder/conversations/..%2Fagents%2Fx' })
      );
    });

    it('does not fetch the conversation when no workflow-authoring tool ran', async () => {
      const fetch = jest.fn().mockResolvedValue({
        conversation_id: 'conv-1',
        response: { message: 'ok' },
        steps: [{ type: 'tool_call', tool_id: 'search', params: {} }],
      });
      const client = new PersonaMatrixChatClient(fetch, { warning: jest.fn() } as never, 'c');

      const res = await client.query('q');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(res.workflowAttachments).toEqual([]);
    });

    it('degrades to no attachments when the conversation read fails', async () => {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce({
          conversation_id: 'conv-1',
          response: { message: 'ok' },
          steps: [generateStep],
        })
        .mockRejectedValueOnce(new Error('boom'));
      const log = { warning: jest.fn() };
      const client = new PersonaMatrixChatClient(fetch, log as never, 'c');

      const res = await client.query('q');

      expect(res.workflowAttachments).toEqual([]);
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});

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

  it('fails soft once the confirmation chain exceeds the cap', async () => {
    const fetch = jest.fn().mockResolvedValue({
      conversation_id: 'c1',
      response: { message: '', prompts: [confirmation('p1')] },
    });

    const result = await createClient(fetch).query('q');

    // 1 initial POST + MAX_AUTO_CONFIRM_ROUNDS continuations (withRetry does not retry this error)
    expect(fetch).toHaveBeenCalledTimes(1 + MAX_AUTO_CONFIRM_ROUNDS);
    // The partial trajectory is preserved and the stuck-agent loop is recorded
    // as an error on the scored row instead of aborting the whole suite.
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('error');
    expect(result.errors[0].error.message).toMatch(/exceeded 3 auto-confirm/);
    expect(result.messages[0].message).toMatch(UNANSWERED_PROMPT_MARKER);
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
