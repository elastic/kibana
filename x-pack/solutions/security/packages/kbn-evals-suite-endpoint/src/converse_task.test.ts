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
      prompts: [],
    });
  });

  describe('pending HITL confirmation', () => {
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

    it('records the pending tool, its arguments and the confirmation text in the message', async () => {
      const agentBuilderClient = createClient({
        message: '',
        steps: [isolateStep],
        traceId: 'trace-1',
        prompts: [confirmationPrompt],
      });

      const result = await converseQuestionToTaskOutput(
        agentBuilderClient,
        'Isolate eval-host-isolate'
      );
      const assistantMessage = result.messages[1].message;

      expect(assistantMessage).toContain('NOT been executed');
      expect(assistantMessage).toContain('endpoint-response-actions.isolate_host');
      expect(assistantMessage).toContain('"hostName":"eval-host-isolate"');
      expect(assistantMessage).toContain('This will disconnect **eval-host-isolate**');
      expect(result.prompts).toEqual([confirmationPrompt]);
    });

    it('keeps the assistant text and appends the pending confirmation', async () => {
      const agentBuilderClient = createClient({
        message: 'Requesting isolation.',
        steps: [isolateStep],
        prompts: [confirmationPrompt],
      });

      const result = await converseQuestionToTaskOutput(
        agentBuilderClient,
        'Isolate eval-host-isolate'
      );

      expect(result.messages[1].message).toMatch(
        /^Requesting isolation\.\n\n\[Pending confirmation/
      );
    });

    it('matches the step by tool_call_id so the right host is reported with parallel calls', async () => {
      const otherStep = {
        ...isolateStep,
        tool_call_id: 'call-2',
        params: { hostName: 'some-other-host' },
      };
      const agentBuilderClient = createClient({
        message: '',
        steps: [otherStep, isolateStep],
        prompts: [confirmationPrompt],
      });

      const result = await converseQuestionToTaskOutput(
        agentBuilderClient,
        'Isolate eval-host-isolate'
      );

      expect(result.messages[1].message).toContain('eval-host-isolate');
      expect(result.messages[1].message).not.toContain('some-other-host');
    });

    it('still reports the prompt text when no matching tool step exists', async () => {
      const agentBuilderClient = createClient({
        message: '',
        steps: [],
        prompts: [confirmationPrompt],
      });

      const result = await converseQuestionToTaskOutput(
        agentBuilderClient,
        'Isolate eval-host-isolate'
      );

      expect(result.messages[1].message).toContain(
        'Requested tool: endpoint-response-actions.isolate_host'
      );
      expect(result.messages[1].message).toContain('eval-host-isolate');
    });

    it('leaves the message untouched when there are no prompts', async () => {
      const agentBuilderClient = createClient({ message: 'hi', steps: [] });

      const result = await converseQuestionToTaskOutput(agentBuilderClient, 'hello');

      expect(result.messages[1].message).toBe('hi');
      expect(result.prompts).toEqual([]);
    });
  });
});
