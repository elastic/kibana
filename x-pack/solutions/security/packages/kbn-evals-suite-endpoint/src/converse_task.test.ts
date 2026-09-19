/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';

const toolCall = (toolId: string, results: unknown[] = []) => ({
  type: 'tool_call',
  tool_id: toolId,
  results,
});

const createClient = (converse: jest.Mock): AgentBuilderClient => ({
  createConversation: jest.fn(),
  converse,
  getConversation: jest.fn(),
});

describe('converse_task', () => {
  it('converseQuestionToTaskOutput uses the default agent and maps eval task shape', async () => {
    const converse = jest.fn().mockResolvedValue({
      message: 'assistant answer',
      steps: [toolCall('platform.core.execute_esql')],
      prompts: [],
      traceId: 'trace-abc',
    });

    const result = await converseQuestionToTaskOutput(
      createClient(converse),
      'who is patient zero?'
    );

    expect(converse).toHaveBeenCalledWith({
      agentId: agentBuilderDefaultAgentId,
      input: 'who is patient zero?',
    });
    expect(result).toEqual({
      messages: [{ message: 'who is patient zero?' }, { message: 'assistant answer' }],
      steps: [toolCall('platform.core.execute_esql')],
      errors: [],
      prompts: [],
      traceId: 'trace-abc',
    });
  });

  it('refuses a destructive confirmation and continues the run', async () => {
    // The write-action boundary row: a destructive execute_api call returns
    // `prompts.askForConfirmation(...)` instead of a result, so the run used to
    // be stored with an empty final message and no trace of what it was waiting
    // for. The harness now refuses on the analyst's behalf and keeps going.
    const converse = jest
      .fn()
      .mockResolvedValueOnce({
        message: '',
        steps: [toolCall('execute_api')],
        prompts: [
          {
            id: 'execute_api.tool-call-1',
            type: 'confirmation',
            title: 'Allow `execute_api` to run?',
          },
        ],
        conversationId: 'conversation-1',
        traceId: 'trace-1',
      })
      .mockResolvedValueOnce({
        message: 'I cannot isolate a host from chat — use the Response Actions UI.',
        steps: [toolCall('load_skill')],
        prompts: [],
        conversationId: 'conversation-1',
        traceId: 'trace-1',
      });

    const result = await converseQuestionToTaskOutput(createClient(converse), 'Isolate host X');

    expect(converse).toHaveBeenLastCalledWith({
      agentId: agentBuilderDefaultAgentId,
      conversationId: 'conversation-1',
      promptResponses: { 'execute_api.tool-call-1': { allow: false } },
    });
    expect(result.messages).toEqual([
      { message: 'Isolate host X' },
      { message: '' },
      { message: 'I cannot isolate a host from chat — use the Response Actions UI.' },
    ]);
    expect(result.steps.map((step) => step.tool_id)).toEqual(['execute_api', 'load_skill']);
    expect(result.prompts).toEqual([
      { id: 'execute_api.tool-call-1', type: 'confirmation', answer: { allow: false } },
    ]);
    expect(result.traceId).toBe('trace-1');
  });

  it('refuses an authorization prompt too', async () => {
    const converse = jest
      .fn()
      .mockResolvedValueOnce({
        message: '',
        steps: [],
        prompts: [{ id: 'connector.auth-1', type: 'authorization' }],
        conversationId: 'conversation-1',
        traceId: 'trace-1',
      })
      .mockResolvedValueOnce({ message: 'Not authorized.', steps: [], prompts: [] });

    const result = await converseQuestionToTaskOutput(createClient(converse), 'Run the connector');

    expect(converse).toHaveBeenLastCalledWith({
      agentId: agentBuilderDefaultAgentId,
      conversationId: 'conversation-1',
      promptResponses: { 'connector.auth-1': { authorized: false } },
    });
    expect(result.prompts).toEqual([
      { id: 'connector.auth-1', type: 'authorization', answer: { authorized: false } },
    ]);
  });

  it('records an ask_user_question prompt and stops instead of answering it', async () => {
    const converse = jest.fn().mockResolvedValue({
      message: '',
      steps: [],
      prompts: [{ id: 'ask_user_question.q1', type: 'ask_user_question' }],
      conversationId: 'conversation-1',
      traceId: 'trace-1',
    });

    const result = await converseQuestionToTaskOutput(createClient(converse), 'Which host?');

    expect(converse).toHaveBeenCalledTimes(1);
    expect(result.prompts).toEqual([{ id: 'ask_user_question.q1', type: 'ask_user_question' }]);
  });

  it('does not answer prompts when there is no conversation to continue', async () => {
    const converse = jest.fn().mockResolvedValue({
      message: '',
      steps: [],
      prompts: [{ id: 'execute_api.tool-call-1', type: 'confirmation' }],
      traceId: 'trace-1',
    });

    const result = await converseQuestionToTaskOutput(createClient(converse), 'Isolate host X');

    expect(converse).toHaveBeenCalledTimes(1);
    expect(result.prompts).toEqual([{ id: 'execute_api.tool-call-1', type: 'confirmation' }]);
  });

  it('records tool errors instead of reporting none', async () => {
    const converse = jest.fn().mockResolvedValue({
      message: 'done',
      steps: [
        toolCall('execute_api', [
          {
            tool_result_id: 'result-1',
            type: 'error',
            data: { message: 'API request failed: Bad Request' },
          },
        ]),
        toolCall('load_skill', [{ tool_result_id: 'result-2', type: 'other', data: {} }]),
      ],
      prompts: [],
      traceId: 'trace-1',
    });

    const result = await converseQuestionToTaskOutput(createClient(converse), 'q');

    expect(result.errors).toEqual([
      { tool_id: 'execute_api', message: 'API request failed: Bad Request' },
    ]);
  });
});
