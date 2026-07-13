/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderClient } from '@kbn/evals';
import { converseQuestionToTaskOutput, resolveSecurityEvalAgentId } from './converse_task';

describe('converse_task', () => {
  const originalAgentId = process.env.AGENT_BUILDER_AGENT_ID;

  afterEach(() => {
    if (originalAgentId === undefined) {
      delete process.env.AGENT_BUILDER_AGENT_ID;
    } else {
      process.env.AGENT_BUILDER_AGENT_ID = originalAgentId;
    }
  });

  it('resolveSecurityEvalAgentId prefers AGENT_BUILDER_AGENT_ID', () => {
    process.env.AGENT_BUILDER_AGENT_ID = 'custom-agent';
    expect(resolveSecurityEvalAgentId()).toBe('custom-agent');
  });

  it('resolveSecurityEvalAgentId falls back to platform default', () => {
    delete process.env.AGENT_BUILDER_AGENT_ID;
    expect(resolveSecurityEvalAgentId()).toBe(agentBuilderDefaultAgentId);
  });

  it('converseQuestionToTaskOutput maps Agent Builder response to eval task shape', async () => {
    const agentBuilderClient: AgentBuilderClient = {
      converse: jest.fn().mockResolvedValue({
        message: 'assistant answer',
        steps: [{ type: 'tool_call', tool_id: 'platform.core.execute_esql' }],
        traceId: 'trace-abc',
      }),
    };

    const result = await converseQuestionToTaskOutput(agentBuilderClient, 'who is patient zero?');

    expect(agentBuilderClient.converse).toHaveBeenCalledWith({
      agentId: resolveSecurityEvalAgentId(),
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
