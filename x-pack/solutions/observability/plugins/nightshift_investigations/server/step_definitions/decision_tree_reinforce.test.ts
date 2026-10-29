/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../agents/decision_tree_reinforcement';
import { DECISION_TREE_LEARNING_TOOL_IDS } from '../tools/decision_tree';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { decisionTreeReinforceStepDefinition } from './decision_tree_reinforce';

describe('decisionTreeReinforceStepDefinition', () => {
  const fakeRequest = { headers: {} };
  const runAgent = jest.fn();
  const agentBuilder = { agents: { runAgent } } as unknown as AgentBuilderPluginStart;

  const createContext = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({
          workflow: { spaceId: 'space-1' },
          execution: { id: 'exec-1' },
        }),
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'reinforce_decision_trees',
      stepType: 'nightshift.decisionTreeReinforce',
    } as never);

  const run = (input: Record<string, unknown>) =>
    decisionTreeReinforceStepDefinition({ getAgentBuilder: () => agentBuilder }).handler(
      createContext({
        prompt: 'Why is checkout slow?',
        response: 'Connection pool exhausted.',
        round_id: 'round-1',
        message: '<!-- nightshift-accessed-trees: -->\nTask: create a new decision tree',
        turn_kind: 'initial_investigation',
        connector_id: 'claude-sonnet',
        ...input,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    runAgent.mockResolvedValue({
      result: { round: { response: { message: 'Persisted 1 tree' } } },
    });
  });

  it("replays the investigator's round as history before the turn message", async () => {
    const results = [{ tool_result_id: 'r-1', type: ToolResultType.other, data: { stdout: '0' } }];
    const output = await run({
      tool_calls: [{ tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', params: {} }],
      tool_results: [{ tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', results }],
    });

    expect(output).toEqual({ output: { message: 'Persisted 1 tree' } });
    const [{ agentId, request, agentParams, interactive, defaultConnectorId }] =
      runAgent.mock.calls[0];
    expect(agentId).toBe(NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID);
    expect(request).toBe(fakeRequest);
    expect(interactive).toEqual({ enabled: false });
    expect(defaultConnectorId).toBe('claude-sonnet');
    expect(agentParams.nextInput).toEqual({
      message: '<!-- nightshift-accessed-trees: -->\nTask: create a new decision tree',
    });
    expect(agentParams.conversation.rounds).toEqual([
      expect.objectContaining({
        id: 'round-1',
        input: { message: 'Why is checkout slow?' },
        response: { message: 'Connection pool exhausted.' },
        steps: [expect.objectContaining({ tool_call_id: 'toolu_1', results })],
      }),
    ]);
  });

  it('withholds the learning tools on an initial investigation', async () => {
    await run({ turn_kind: 'initial_investigation' });

    expect(runAgent.mock.calls[0][0].agentParams.configurationOverrides).toBeUndefined();
  });

  it('adds the learning tools on a follow-up turn', async () => {
    await run({ turn_kind: 'feedback_reinforcement' });

    expect(runAgent.mock.calls[0][0].agentParams.configurationOverrides).toEqual({
      tools: [{ tool_ids: [...DECISION_TREE_LEARNING_TOOL_IDS] }],
    });
  });

  // Liquid renders an absent workflow input as an empty string.
  it('treats empty connector and round ids as unset', async () => {
    await run({ connector_id: '', round_id: '' });

    const [{ defaultConnectorId, agentParams }] = runAgent.mock.calls[0];
    expect(defaultConnectorId).toBeUndefined();
    expect(agentParams.conversation.rounds[0].id).not.toBe('');
  });

  it('runs each turn in a fresh conversation so hydration gets its own sandbox', async () => {
    await run({});
    await run({});

    const [first, second] = runAgent.mock.calls.map(
      ([params]) => params.agentParams.conversation.id
    );
    expect(first).not.toBe(second);
  });

  it('fails when Agent Builder has not started', async () => {
    await expect(
      decisionTreeReinforceStepDefinition({ getAgentBuilder: () => undefined }).handler(
        createContext({})
      )
    ).rejects.toThrow('Agent Builder is not available');
  });
});
