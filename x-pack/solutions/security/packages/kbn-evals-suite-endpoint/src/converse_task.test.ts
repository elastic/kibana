/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';

const confirmationPrompt = (id: string) => ({
  type: 'confirmation' as const,
  id,
  title: 'Confirm',
  message: 'Run the tool?',
});

const buildClient = (
  responses: Array<Partial<Awaited<ReturnType<AgentBuilderClient['converse']>>>>
): AgentBuilderClient => {
  const converse = jest.fn();
  responses.forEach((response) => converse.mockResolvedValueOnce(response));
  return {
    createConversation: jest.fn(),
    converse,
    getConversation: jest.fn(),
  };
};

describe('converse_task', () => {
  it('converseQuestionToTaskOutput uses the default agent and maps eval task shape', async () => {
    const agentBuilderClient: AgentBuilderClient = {
      createConversation: jest.fn(),
      converse: jest.fn().mockResolvedValue({
        message: 'assistant answer',
        steps: [{ type: 'tool_call', tool_id: 'platform.core.execute_esql' }],
        traceId: 'trace-abc',
      }),
      getConversation: jest.fn(),
    };

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

  it('does not resume when a confirmation prompt is returned and confirmations are not enabled', async () => {
    const client = buildClient([
      {
        message: 'I need confirmation',
        steps: [],
        conversationId: 'conv-1',
        traceId: 'trace-1',
        prompts: [confirmationPrompt('tools.x.confirmation')],
      },
    ]);

    const result = await converseQuestionToTaskOutput(client, 'isolate the host');

    expect(client.converse).toHaveBeenCalledTimes(1);
    expect(result.steps).toEqual([]);
    expect(result.traceId).toBe('trace-1');
  });

  it('answers a pending confirmation prompt and resumes the conversation when confirmations are allowed', async () => {
    const client = buildClient([
      {
        message: 'I need confirmation',
        steps: [],
        conversationId: 'conv-1',
        traceId: 'trace-1',
        prompts: [confirmationPrompt('tools.x.confirmation')],
      },
      {
        message: 'Host isolated',
        steps: [{ type: 'tool_call', tool_id: 'endpoint-response-actions.isolate_host' }],
        conversationId: 'conv-1',
        traceId: 'trace-1',
        prompts: [],
      },
    ]);

    const result = await converseQuestionToTaskOutput(client, 'isolate the host', {
      confirmations: 'allow',
    });

    expect(client.converse).toHaveBeenNthCalledWith(1, {
      agentId: agentBuilderDefaultAgentId,
      input: 'isolate the host',
    });
    expect(client.converse).toHaveBeenNthCalledWith(2, {
      agentId: agentBuilderDefaultAgentId,
      conversationId: 'conv-1',
      promptResponses: { 'tools.x.confirmation': { allow: true } },
    });
    expect(result.steps).toEqual([
      { type: 'tool_call', tool_id: 'endpoint-response-actions.isolate_host' },
    ]);
    expect(result.messages).toEqual([
      { message: 'isolate the host' },
      { message: 'I need confirmation' },
      { message: 'Host isolated' },
    ]);
    expect(result.traceId).toBe('trace-1');
  });

  it('stops without resuming when the agent asks no prompts', async () => {
    const client = buildClient([
      {
        message: 'Done',
        steps: [{ type: 'tool_call', tool_id: 'endpoint-response-actions.list_endpoints' }],
        conversationId: 'conv-1',
        traceId: 'trace-1',
        prompts: [],
      },
    ]);

    const result = await converseQuestionToTaskOutput(client, 'list endpoints', {
      confirmations: 'allow',
    });

    expect(client.converse).toHaveBeenCalledTimes(1);
    expect(result.steps).toEqual([
      { type: 'tool_call', tool_id: 'endpoint-response-actions.list_endpoints' },
    ]);
  });

  it('ignores non-confirmation prompts so ask_user_question does not trigger a resume', async () => {
    const client = buildClient([
      {
        message: 'Which host?',
        steps: [],
        conversationId: 'conv-1',
        traceId: 'trace-1',
        prompts: [{ type: 'ask_user_question', id: 'ask-1', questions: [] }],
      },
    ]);

    await converseQuestionToTaskOutput(client, 'isolate it', { confirmations: 'allow' });

    expect(client.converse).toHaveBeenCalledTimes(1);
  });

  it('stops resuming once the confirmation round cap is reached', async () => {
    const pendingConfirmation = {
      message: 'Confirm?',
      steps: [],
      conversationId: 'conv-1',
      traceId: 'trace-1',
      prompts: [confirmationPrompt('tools.x.confirmation')],
    };
    const client = buildClient(Array.from({ length: 8 }, () => pendingConfirmation));

    await converseQuestionToTaskOutput(client, 'isolate the host', { confirmations: 'allow' });

    // 1 initial turn + 5 capped resumes
    expect(client.converse).toHaveBeenCalledTimes(6);
  });
});
