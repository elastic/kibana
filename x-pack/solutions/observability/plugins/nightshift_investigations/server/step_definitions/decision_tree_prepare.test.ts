/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { decisionTreePrepareStepDefinition } from './decision_tree_prepare';

jest.mock('../decision_trees/register_decision_trees', () => ({
  prepareReinforcementTurn: jest.fn(),
}));

const readTree = (id: string, slug: string) => ({
  type: 'tool_call',
  tool_call_id: id,
  tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
  params: { file_path: `/workspace/decision-trees/decision_tree_${slug}.md` },
  results: [{ type: 'other', data: { content: 'tree' } }],
});

describe('decisionTreePrepareStepDefinition', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  const conversationsGet = jest.fn();
  const agentBuilder = {
    conversations: {
      getScopedClient: jest.fn().mockResolvedValue({ get: conversationsGet }),
    },
  };

  const createContext = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'space-1' } }),
        getFakeRequest: jest.fn().mockReturnValue(request),
        getScopedEsClient: jest.fn().mockReturnValue({}),
        renderInputTemplate: jest.fn((val) => val),
        callKibanaApi: jest.fn(),
      },
      logger,
      abortSignal: new AbortController().signal,
      stepId: 'decision_tree_prepare',
      stepType: 'nightshift.decisionTreePrepare',
    } as never);

  const run = (
    input: Record<string, unknown>,
    {
      getTelemetryConnectorId = () => undefined,
    }: {
      getTelemetryConnectorId?: () => string | undefined | Promise<string | undefined>;
    } = {}
  ) =>
    decisionTreePrepareStepDefinition({
      getTelemetryConnectorId,
      getAgentBuilder: () => agentBuilder as never,
      logger,
    }).handler(createContext(input));

  const investigatorRound = {
    agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    conversation_id: 'inv-1',
    round_id: 'round-3',
    round_kind: 'initial',
  };
  const skipped = {
    output: {
      message: '',
      tree_count: 0,
      turn_kind: 'initial_investigation',
      offer_learning_tools: false,
      skipped: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prepareReinforcementTurn).mockResolvedValue({
      skipped: false,
      message: 'turn prompt',
      treeCount: 1,
      turnKind: 'feedback_reinforcement',
      offerLearningTools: true,
    });
    conversationsGet.mockResolvedValue({ rounds: [] });
  });

  it('skips a round with no agent_id rather than trusting it', async () => {
    await expect(run({ conversation_id: 'inv-1', round_kind: 'initial' })).resolves.toEqual(
      skipped
    );
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  it('skips a round from another agent', async () => {
    await expect(
      run({ ...investigatorRound, agent_id: 'significant-events.investigation' })
    ).resolves.toEqual(skipped);
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  it('fails when the round names no investigation', async () => {
    await expect(run({ ...investigatorRound, conversation_id: '' })).rejects.toThrow(
      /needs the conversation of the round/
    );
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  // Liquid renders a workflow_context entry the before-agent workflow left out as ''.
  it.each(['', 'recovery'])(
    'fails rather than guessing when the round kind is %p',
    async (roundKind) => {
      await expect(run({ ...investigatorRound, round_kind: roundKind })).rejects.toThrow(
        /has no round kind/
      );
      expect(prepareReinforcementTurn).not.toHaveBeenCalled();
    }
  );

  it('resolves reinforcement connectors from the investigation conversation', async () => {
    const getTelemetryConnectorId = jest.fn().mockResolvedValue('orca');
    await run(investigatorRound, { getTelemetryConnectorId });

    expect(getTelemetryConnectorId).toHaveBeenCalledWith(request, 'inv-1');
    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({ connectorNames: ['orca'] })
    );
  });

  it('prepares a first round from its own tree reads only', async () => {
    await expect(run(investigatorRound)).resolves.toEqual({
      output: {
        message: 'turn prompt',
        tree_count: 1,
        turn_kind: 'feedback_reinforcement',
        offer_learning_tools: true,
        skipped: false,
      },
    });
    expect(conversationsGet).not.toHaveBeenCalled();
    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        roundKind: 'initial',
        investigationId: 'inv-1',
        earlierAccessedTreeIds: [],
        spaceId: 'space-1',
      })
    );
  });

  it('hands the verdict on the round to the turn', async () => {
    await run({
      ...investigatorRound,
      round_kind: 'follow_up',
      is_feedback: true,
      causal_confirmed: true,
      causal_summary: 'The deploy caused it.',
      learning: 'Check deploys first.',
    });

    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: {
          isFeedback: true,
          causalConfirmed: true,
          causalSummary: 'The deploy caused it.',
          learning: 'Check deploys first.',
        },
      })
    );
  });

  it('reads a missing verdict as no verdict, and never as a confirmation', async () => {
    await run({ ...investigatorRound, round_kind: 'follow_up', causal_confirmed: true });

    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: { isFeedback: false, causalConfirmed: false, causalSummary: '', learning: '' },
      })
    );
  });

  it.each(['follow_up', 'alert_recovery'] as const)(
    'hands a %s round the trees opened in the earlier rounds',
    async (roundKind) => {
      conversationsGet.mockResolvedValue({
        rounds: [
          { id: 'round-1', steps: [readTree('a', 'checkout-high-latency')] },
          { id: 'round-2', steps: [] },
          // The round being reinforced: its reads arrive through the hook's tool calls.
          { id: 'round-3', steps: [readTree('b', 'payment-errors')] },
        ],
      });

      await run({ ...investigatorRound, round_kind: roundKind });

      expect(conversationsGet).toHaveBeenCalledWith('inv-1');
      expect(prepareReinforcementTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          roundKind,
          earlierAccessedTreeIds: ['symptom:checkout-high-latency'],
        })
      );
    }
  );

  it('skips a follow-up that has no tree to build on', async () => {
    jest.mocked(prepareReinforcementTurn).mockResolvedValue({ skipped: true });

    await expect(run({ ...investigatorRound, round_kind: 'follow_up' })).resolves.toEqual(skipped);
  });
});
