/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';

const createClient = (response: Record<string, unknown>): AgentBuilderClient => ({
  createConversation: jest.fn(),
  converse: jest.fn().mockResolvedValue(response),
  getConversation: jest.fn(),
});

const confirmationPrompt = {
  type: 'confirmation',
  id: 'tools.endpoint-response-actions.isolate_host.confirmation.call-1',
  title: 'Isolate host?',
  message: 'This will disconnect **eval-host-isolate** from the network.',
  confirm_text: 'Isolate host',
};

const isolateStep = {
  type: 'tool_call',
  tool_id: 'endpoint-response-actions.isolate_host',
  tool_call_id: 'call-1',
  params: { hostName: 'eval-host-isolate' },
};

describe('converse_task', () => {
  it('converseQuestionToTaskOutput uses the default agent and maps eval task shape', async () => {
    const agentBuilderClient = createClient({
      message: 'assistant answer',
      steps: [{ type: 'tool_call', tool_id: 'platform.core.execute_esql' }],
      traceId: 'trace-abc',
      prompts: [],
    });

    const result = await converseQuestionToTaskOutput(agentBuilderClient, 'who is patient zero?');

    expect(agentBuilderClient.converse).toHaveBeenCalledWith({
      agentId: agentBuilderDefaultAgentId,
      input: 'who is patient zero?',
    });
    expect(result).toEqual({
      messages: [{ message: 'who is patient zero?' }, { message: 'assistant answer' }],
      steps: [{ type: 'tool_call', tool_id: 'platform.core.execute_esql' }],
      errors: [],
      traceId: 'trace-abc',
    });
  });

  describe('a round paused on a tool confirmation', () => {
    const pausedClient = () =>
      createClient({
        message: 'Requesting isolation.',
        steps: [isolateStep],
        traceId: 'trace-1',
        prompts: [confirmationPrompt],
      });

    it('leaves the default output unchanged for suites that do not opt in', async () => {
      const result = await converseQuestionToTaskOutput(
        pausedClient(),
        'Isolate eval-host-isolate'
      );

      expect(result).toEqual({
        messages: [{ message: 'Isolate eval-host-isolate' }, { message: 'Requesting isolation.' }],
        steps: [isolateStep],
        errors: [],
        traceId: 'trace-1',
      });
    });

    it('reports which call is pending without putting the tool-rendered card text in the judged output', async () => {
      const result = await converseQuestionToTaskOutput(
        pausedClient(),
        'Isolate eval-host-isolate',
        {
          includePendingConfirmations: true,
        }
      );

      expect(result.pending_confirmations).toEqual([
        { tool_id: 'endpoint-response-actions.isolate_host', tool_call_id: 'call-1' },
      ]);
      expect(JSON.stringify(result)).not.toContain('This will disconnect');
      expect(JSON.stringify(result)).not.toContain('Isolate host?');
      expect(result.messages[1].message).toBe('Requesting isolation.');
    });

    it('records the model-supplied arguments from steps, not from the card', async () => {
      const result = await converseQuestionToTaskOutput(
        pausedClient(),
        'Isolate eval-host-isolate',
        {
          includePendingConfirmations: true,
        }
      );

      expect(result.steps[0]).toMatchObject({ params: { hostName: 'eval-host-isolate' } });
    });

    it('records an empty assistant turn as empty rather than inventing text', async () => {
      const client = createClient({
        message: '',
        steps: [isolateStep],
        traceId: 'trace-2',
        prompts: [confirmationPrompt],
      });

      const result = await converseQuestionToTaskOutput(client, 'Isolate eval-host-isolate', {
        includePendingConfirmations: true,
      });

      expect(result.messages[1].message).toBe('');
      expect(result.pending_confirmations).toHaveLength(1);
    });

    it('ignores prompts that are not tool confirmations and reports none when there are no prompts', async () => {
      const client = createClient({
        message: 'ok',
        steps: [],
        traceId: 'trace-3',
        prompts: [{ type: 'authorization', id: 'something.else' }, null, 'x'],
      });

      const result = await converseQuestionToTaskOutput(client, 'q', {
        includePendingConfirmations: true,
      });

      expect(result.pending_confirmations).toEqual([]);

      const noPrompts = await converseQuestionToTaskOutput(
        createClient({ message: 'ok', steps: [], traceId: 't' }),
        'q',
        { includePendingConfirmations: true }
      );
      expect(noPrompts.pending_confirmations).toEqual([]);
    });

    it('handles a confirmation id with no tool-call suffix', async () => {
      const client = createClient({
        message: '',
        steps: [],
        traceId: 'trace-4',
        prompts: [{ id: 'tools.endpoint-response-actions.scan_host.confirmation' }],
      });

      const result = await converseQuestionToTaskOutput(client, 'q', {
        includePendingConfirmations: true,
      });

      expect(result.pending_confirmations).toEqual([
        { tool_id: 'endpoint-response-actions.scan_host' },
      ]);
    });
  });

  describe('follow-up turns in the same conversation', () => {
    const secondPrompt = {
      type: 'confirmation',
      id: 'tools.endpoint-response-actions.isolate_host.confirmation.call-2',
    };
    const secondStep = {
      type: 'tool_call',
      tool_id: 'endpoint-response-actions.isolate_host',
      tool_call_id: 'call-2',
      params: { hostName: 'eval-host-release' },
    };

    const sequentialClient = (): AgentBuilderClient => ({
      createConversation: jest.fn(),
      getConversation: jest.fn(),
      converse: jest
        .fn()
        .mockResolvedValueOnce({
          message: '',
          steps: [isolateStep],
          traceId: 'trace-1',
          conversationId: 'conv-1',
          prompts: [confirmationPrompt],
        })
        .mockResolvedValueOnce({
          message: 'Next: eval-host-release.',
          steps: [secondStep],
          traceId: 'trace-2',
          conversationId: 'conv-1',
          prompts: [secondPrompt],
        }),
    });

    it('answers the pending confirmation by prompt id in the same conversation and accumulates both turns', async () => {
      const client = sequentialClient();

      const result = await converseQuestionToTaskOutput(client, 'isolate both', {
        includePendingConfirmations: true,
        followUps: [{ confirm: true }],
      });

      expect(client.converse).toHaveBeenNthCalledWith(2, {
        agentId: agentBuilderDefaultAgentId,
        conversationId: 'conv-1',
        promptResponses: { [confirmationPrompt.id]: { allow: true } },
      });
      expect(result.steps).toEqual([isolateStep, secondStep]);
      expect(result.pending_confirmations).toEqual([
        { tool_id: 'endpoint-response-actions.isolate_host', tool_call_id: 'call-1' },
        { tool_id: 'endpoint-response-actions.isolate_host', tool_call_id: 'call-2' },
      ]);
      expect(result.confirmation_decisions).toEqual([
        {
          tool_id: 'endpoint-response-actions.isolate_host',
          tool_call_id: 'call-1',
          allow: true,
        },
      ]);
      expect(result.traceId).toBe('trace-2');
      expect(result.errors).toEqual([]);
    });

    it('keeps one, resolved copy of the paused call when the resume returns the whole round', async () => {
      const resolvedIsolateStep = {
        ...isolateStep,
        results: [{ type: 'other', data: { ok: true } }],
      };
      const client: AgentBuilderClient = {
        createConversation: jest.fn(),
        getConversation: jest.fn(),
        converse: jest
          .fn()
          .mockResolvedValueOnce({
            message: '',
            steps: [isolateStep],
            traceId: 'trace-1',
            conversationId: 'conv-1',
            prompts: [confirmationPrompt],
          })
          .mockResolvedValueOnce({
            message: 'Next: eval-host-release.',
            steps: [resolvedIsolateStep, secondStep],
            traceId: 'trace-2',
            conversationId: 'conv-1',
            prompts: [secondPrompt],
          }),
      };

      const result = await converseQuestionToTaskOutput(client, 'isolate both', {
        includePendingConfirmations: true,
        followUps: [{ confirm: true }],
      });

      expect(result.steps).toEqual([resolvedIsolateStep, secondStep]);
    });

    it('sends allow: false for a decline', async () => {
      const client = sequentialClient();

      const result = await converseQuestionToTaskOutput(client, 'isolate both', {
        includePendingConfirmations: true,
        followUps: [{ confirm: false }],
      });

      expect(client.converse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ promptResponses: { [confirmationPrompt.id]: { allow: false } } })
      );
      expect(result.confirmation_decisions).toEqual([
        expect.objectContaining({ tool_call_id: 'call-1', allow: false }),
      ]);
    });

    it('sends a message follow-up as input on the same conversation', async () => {
      const client = createClient({
        message: 'patient zero is WKSTN-RECV01',
        steps: [],
        traceId: 'trace-1',
        conversationId: 'conv-9',
        prompts: [],
      });

      await converseQuestionToTaskOutput(client, 'who is patient zero?', {
        followUps: [{ message: 'Isolate that host.' }],
      });

      expect(client.converse).toHaveBeenNthCalledWith(2, {
        agentId: agentBuilderDefaultAgentId,
        conversationId: 'conv-9',
        input: 'Isolate that host.',
      });
    });

    it('records an error instead of sending when there is nothing to confirm', async () => {
      const client = createClient({
        message: 'ok',
        steps: [],
        traceId: 'trace-1',
        conversationId: 'conv-1',
        prompts: [],
      });

      const result = await converseQuestionToTaskOutput(client, 'q', {
        followUps: [{ confirm: true }],
      });

      expect(client.converse).toHaveBeenCalledTimes(1);
      expect(result.errors).toHaveLength(1);
    });

    it('records an error when the first turn returned no conversation id', async () => {
      const client = createClient({ message: 'ok', steps: [], traceId: 't', prompts: [] });

      const result = await converseQuestionToTaskOutput(client, 'q', {
        followUps: [{ message: 'more' }],
      });

      expect(client.converse).toHaveBeenCalledTimes(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
