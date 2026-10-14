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
});
