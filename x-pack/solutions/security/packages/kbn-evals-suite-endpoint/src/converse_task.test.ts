/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import { converseQuestionToTaskOutput } from './converse_task';

describe('converse_task', () => {
  it('converseQuestionToTaskOutput uses the default agent and maps eval task shape', async () => {
    const agentBuilderClient: AgentBuilderClient = {
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
});
