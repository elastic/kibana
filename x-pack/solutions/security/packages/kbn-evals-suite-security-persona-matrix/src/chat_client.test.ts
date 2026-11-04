/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersonaMatrixChatClient } from './chat_client';

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
