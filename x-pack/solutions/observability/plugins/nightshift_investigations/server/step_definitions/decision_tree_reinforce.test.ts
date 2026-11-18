/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  createConversationNotFoundError,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../agents/decision_tree_reinforcement';
import {
  DECISION_TREE_LEARNING_TOOL_IDS,
  DECISION_TREE_SUBMIT_TOOL_ID,
} from '../tools/decision_tree';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import {
  agentTraceId,
  decisionTreeReinforceStepDefinition,
  lastSubmitRejected,
} from './decision_tree_reinforce';
import { REPLAY_CONVERSATION_ID_PREFIX } from '@kbn/nightshift-decision-trees';

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

    const [{ agentId, request, agentParams, interactive, defaultModel }] = runAgent.mock.calls[0];
    expect(output).toEqual({
      output: {
        message: 'Persisted 1 tree',
        conversation_id: agentParams.conversation.id,
        submissions_json: '[]',
      },
    });
    expect(agentId).toBe(NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID);
    expect(request).toBe(fakeRequest);
    expect(interactive).toEqual({ enabled: false });
    expect(defaultModel).toEqual({ connectorId: 'claude-sonnet' });
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

  it('replays earlier rounds before a follow-up round while prioritizing the latest round result budget', async () => {
    const huge = 'x'.repeat(150_000);
    const r1Results = [
      { tool_result_id: 'r-1', type: ToolResultType.other, data: { stdout: huge } },
    ];
    const r2Results = [
      { tool_result_id: 'r-2', type: ToolResultType.other, data: { stdout: huge } },
    ];
    const get = jest.fn().mockResolvedValue({
      id: 'inv-1',
      rounds: [
        {
          id: 'round-1',
          started_at: '2026-11-06T07:20:01.000Z',
          input: { message: 'Alert fired' },
          response: { message: 'Initial breaker hypothesis' },
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: SANDBOX_BASH_TOOL_ID,
              tool_call_id: 'toolu_r1',
              params: { command: 'esql r1' },
              results: r1Results,
            },
          ],
        },
        {
          id: 'round-2',
          started_at: '2026-11-09T11:43:30.000Z',
          input: { message: 'Alert recovered' },
          response: { message: 'Deployment 1ffce804 had 0 500s\n\nVerdict: contradicted' },
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: SANDBOX_BASH_TOOL_ID,
              tool_call_id: 'toolu_r2',
              params: { command: 'esql r2' },
              results: r2Results,
            },
          ],
        },
      ],
    });
    const withConversations = {
      agents: { runAgent },
      conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
    } as unknown as AgentBuilderPluginStart;

    await decisionTreeReinforceStepDefinition({ getAgentBuilder: () => withConversations }).handler(
      createContext({
        prompt: 'Alert recovered',
        response: 'Deployment 1ffce804 had 0 500s\n\nVerdict: contradicted',
        conversation_id: 'inv-1',
        round_id: 'round-2',
        message: 'Task: merge follow-up',
        turn_kind: 'feedback_reinforcement',
      })
    );

    const [{ agentParams }] = runAgent.mock.calls[0];
    expect(agentParams.conversation.rounds.map((r: { id: string }) => r.id)).toEqual([
      'round-1',
      'round-2',
    ]);
    // Latest round keeps its full result; older round overflows the 200k shared budget gracefully.
    expect(JSON.stringify(agentParams.conversation.rounds[1].steps)).toContain(huge);
    expect(agentParams.conversation.rounds[0].steps[0]).toMatchObject({
      tool_call_id: 'toolu_r1',
      results: [{ data: { omitted: 'transcript result budget exhausted' } }],
    });
  });

  it('skips a round in a conversation the caller cannot read, without running the agent', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(createConversationNotFoundError({ conversationId: 'private-1' }));
    const withConversations = {
      agents: { runAgent },
      conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
    } as unknown as AgentBuilderPluginStart;

    const output = await decisionTreeReinforceStepDefinition({
      getAgentBuilder: () => withConversations,
    }).handler(
      createContext({
        prompt: 'Why is checkout slow?',
        response: 'Connection pool exhausted.',
        conversation_id: 'private-1',
        round_id: 'round-1',
        message: 'Task: create a new decision tree',
        turn_kind: 'initial_investigation',
        tool_calls: [{ tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', params: {} }],
      })
    );

    expect(output).toEqual({ output: { message: '', skipped: true, submissions_json: '[]' } });
    expect(get).toHaveBeenCalledTimes(1);
    expect(runAgent).not.toHaveBeenCalled();
  });

  describe('a replayed round', () => {
    const results = [{ tool_result_id: 'r-1', type: ToolResultType.other, data: { stdout: '0' } }];
    const get = jest
      .fn()
      .mockRejectedValue(createConversationNotFoundError({ conversationId: 'synthetic-1' }));
    const withConversations = {
      agents: { runAgent },
      conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
    } as unknown as AgentBuilderPluginStart;

    const runReplay = (input: Record<string, unknown>) =>
      decisionTreeReinforceStepDefinition({ getAgentBuilder: () => withConversations }).handler(
        createContext({
          prompt: 'Why is checkout slow?',
          response: 'Connection pool exhausted.',
          conversation_id: `${REPLAY_CONVERSATION_ID_PREFIX}synthetic-1`,
          round_id: 'round-1',
          message: 'Task: create a new decision tree',
          turn_kind: 'initial_investigation',
          tool_calls: [{ tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', params: {} }],
          tool_results: [{ tool_id: SANDBOX_BASH_TOOL_ID, tool_call_id: 'toolu_1', results }],
          ...input,
        })
      );

    // An evaluation's synthetic conversation id is never readable, so the flag must bypass the read.
    it('reinforces from the supplied tool calls without reading the conversation', async () => {
      const output = await runReplay({ replay: true });

      expect(get).not.toHaveBeenCalled();
      expect(runAgent).toHaveBeenCalledTimes(1);
      const [{ agentParams }] = runAgent.mock.calls[0];
      expect(output.output).not.toHaveProperty('skipped');
      expect(agentParams.conversation.rounds).toEqual([
        expect.objectContaining({
          id: 'round-1',
          steps: [expect.objectContaining({ tool_call_id: 'toolu_1', results })],
        }),
      ]);
    });

    it('refuses a replay whose conversation id could name a real investigation', async () => {
      const output = await runReplay({
        replay: true,
        conversation_id: 'b1946ac9-2f3a-4e5d-9c7b-0a1b2c3d4e5f',
      });

      expect(output).toEqual({ output: { message: '', skipped: true, submissions_json: '[]' } });
      expect(runAgent).not.toHaveBeenCalled();
    });

    it('still skips the same unreadable conversation when the round is not a replay', async () => {
      const output = await runReplay({});

      expect(output).toEqual({ output: { message: '', skipped: true, submissions_json: '[]' } });
      expect(get).toHaveBeenCalledTimes(1);
      expect(runAgent).not.toHaveBeenCalled();
    });
  });

  it('returns the submit tool arguments in call order', async () => {
    const merged = { from: ['E3'], into: 'E2' };
    runAgent.mockResolvedValue({
      result: {
        round: {
          response: { message: 'Persisted 1 tree' },
          steps: [
            {
              type: ConversationRoundStepType.reasoning,
              reasoning: 'editing',
            },
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: DECISION_TREE_SUBMIT_TOOL_ID,
              tool_call_id: 'toolu_submit',
              params: {
                symptom_trees: [{ tree_id: 'symptom:eql-slo-burn-rate', merged_nodes: [merged] }],
              },
              results: [],
            },
          ],
        },
      },
    });

    const output = await run({});

    expect(output.output).toEqual(
      expect.objectContaining({
        message: 'Persisted 1 tree',
        submissions_json: JSON.stringify([
          { symptom_trees: [{ tree_id: 'symptom:eql-slo-burn-rate', merged_nodes: [merged] }] },
        ]),
      })
    );
  });

  it('reports a rejected submit so a completed step is not a successful reinforcement', async () => {
    runAgent.mockResolvedValue({
      result: {
        round: {
          response: { message: 'Could not save the tree' },
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: DECISION_TREE_SUBMIT_TOOL_ID,
              tool_call_id: 'toolu_submit',
              params: { symptom_trees: [], traversals: [] },
              results: [{ type: ToolResultType.error, data: { message: 'rejected' } }],
            },
          ],
        },
      },
    });

    const output = await run({});

    expect(output.output).toEqual(expect.objectContaining({ submit_rejected: true }));
    expect(lastSubmitRejected([])).toBe(false);
  });

  it('returns the reinforcement conversation and its Agent Builder trace', async () => {
    runAgent.mockResolvedValue({
      result: {
        round: {
          response: { message: 'Persisted 1 tree' },
          trace_id: ['older-trace', 'agent-trace'],
        },
      },
    });

    const output = await run({});

    expect(output.output).toEqual(
      expect.objectContaining({
        trace_id: 'agent-trace',
        conversation_id: runAgent.mock.calls[0][0].agentParams.conversation.id,
      })
    );
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

    const [{ defaultModel, agentParams }] = runAgent.mock.calls[0];
    expect(defaultModel).toBeUndefined();
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

  it('keeps the last non-empty trace id', () => {
    expect(agentTraceId(['', 'agent-trace'])).toBe('agent-trace');
    expect(agentTraceId('only-trace')).toBe('only-trace');
    expect(agentTraceId(undefined)).toBeUndefined();
  });

  it('fails when Agent Builder has not started', async () => {
    await expect(
      decisionTreeReinforceStepDefinition({ getAgentBuilder: () => undefined }).handler(
        createContext({})
      )
    ).rejects.toThrow('Agent Builder is not available');
  });
});
