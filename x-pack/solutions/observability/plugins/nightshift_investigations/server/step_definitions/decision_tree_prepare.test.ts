/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { NO_CAUSAL_VERDICT } from '../decision_trees/causal_check';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { decisionTreePrepareStepDefinition } from './decision_tree_prepare';

jest.mock('../decision_trees/register_decision_trees', () => ({
  prepareReinforcementTurn: jest.fn(),
}));

jest.mock('../lib/create_optimize_model', () => ({
  createOptimizeModel: jest.fn(),
  createInvestigationMemoryTelemetry: jest.fn(() => ({})),
}));

const readTree = (slug: string) => ({
  type: 'tool_call',
  tool_call_id: `read-${slug}`,
  tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
  params: { file_path: `/workspace/decision-trees/decision_tree_${slug}.md` },
  results: [{ type: 'other', data: { content: 'tree' } }],
});

const savedRound = (id: string, steps: unknown[] = []) => ({ id, steps });

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

  const run = (input: Record<string, unknown>) =>
    decisionTreePrepareStepDefinition({
      getAgentBuilder: () => agentBuilder as never,
      logger,
    }).handler(createContext(input));

  const investigatorRound = {
    agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    conversation_id: 'inv-1',
    round_id: 'round-2',
  };
  const skipped = {
    output: { message: '', tree_count: 0, turn_kind: 'initial_investigation', skipped: true },
  };
  const preparedWith = () => jest.mocked(prepareReinforcementTurn).mock.calls[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(prepareReinforcementTurn).mockResolvedValue({
      skipped: false,
      message: 'turn prompt',
      treeCount: 1,
      turnKind: 'feedback_reinforcement',
      openedTreeIds: ['symptom:checkout-latency'],
    });
    conversationsGet.mockResolvedValue({ rounds: [] });
  });

  it('skips a round with no agent_id rather than trusting it', async () => {
    await expect(run({ conversation_id: 'inv-1', round_id: 'round-2' })).resolves.toEqual(skipped);
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  it('skips a round from another agent', async () => {
    await expect(
      run({ ...investigatorRound, agent_id: 'significant-events.investigation' })
    ).resolves.toEqual(skipped);
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  // A workflow definition stored before the step took `round_id` still passes `response` only.
  it.each([
    ['no round id', { ...investigatorRound, round_id: '', response: 'pool leak' }],
    ['no conversation id', { ...investigatorRound, conversation_id: '' }],
  ])('skips rather than guessing when the round has %s', async (_case, input) => {
    await expect(run(input)).resolves.toEqual(skipped);
    expect(conversationsGet).not.toHaveBeenCalled();
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });

  describe('a first round', () => {
    // Agent Builder starts the post-round workflow before it saves the round.
    it('is one when nothing is saved yet', async () => {
      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({
        turnKind: 'initial_investigation',
        investigationId: 'inv-1',
        earlierAccessedTreeIds: [],
      });
    });

    it('is one when only this round is saved', async () => {
      conversationsGet.mockResolvedValue({ rounds: [savedRound('round-2')] });

      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({ turnKind: 'initial_investigation' });
    });

    // The next round can already be saved by the time the background workflow reads.
    it('is one even when a later round is already saved', async () => {
      conversationsGet.mockResolvedValue({
        rounds: [savedRound('round-2'), savedRound('round-3', [readTree('disk-pressure')])],
      });

      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({
        turnKind: 'initial_investigation',
        earlierAccessedTreeIds: [],
      });
    });

    // A direct chat's conversation is only saved with its first round.
    it('is one when the conversation is not saved yet', async () => {
      conversationsGet.mockRejectedValue(createConversationNotFoundError({ conversationId: 'c' }));

      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({ turnKind: 'initial_investigation' });
    });
  });

  describe('a follow-up', () => {
    it('is one when an earlier round is saved but this one is not yet', async () => {
      conversationsGet.mockResolvedValue({
        rounds: [savedRound('round-1', [readTree('checkout-latency')])],
      });

      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({
        turnKind: 'feedback_reinforcement',
        earlierAccessedTreeIds: ['symptom:checkout-latency'],
      });
    });

    it('reads tree opens only from the rounds before it', async () => {
      conversationsGet.mockResolvedValue({
        rounds: [
          savedRound('round-1', [readTree('checkout-latency')]),
          savedRound('round-2', [readTree('payment-errors')]),
          savedRound('round-3', [readTree('disk-pressure')]),
        ],
      });

      await run(investigatorRound);

      expect(preparedWith()).toMatchObject({
        turnKind: 'feedback_reinforcement',
        earlierAccessedTreeIds: ['symptom:checkout-latency'],
      });
    });

    it('reports the prepared turn', async () => {
      conversationsGet.mockResolvedValue({ rounds: [savedRound('round-1')] });

      await expect(run(investigatorRound)).resolves.toEqual({
        output: {
          message: 'turn prompt',
          tree_count: 1,
          turn_kind: 'feedback_reinforcement',
          skipped: false,
          opened_ids: ['symptom:checkout-latency'],
        },
      });
    });

    it('is skipped when the investigation has no tree to build on', async () => {
      conversationsGet.mockResolvedValue({ rounds: [savedRound('round-1')] });
      jest.mocked(prepareReinforcementTurn).mockResolvedValue({ skipped: true });

      await expect(run(investigatorRound)).resolves.toEqual(skipped);
    });
  });

  describe("a follow-up's causal check", () => {
    const output = jest.fn();
    const followUp = {
      ...investigatorRound,
      prompt: 'It was the egress proxy, per our network team.',
      response: 'Accepted: the egress proxy.',
      connector_id: '',
      round_connector_id: 'round-model',
    };
    const verdict = {
      isFeedback: true,
      causalConfirmed: false,
      causalSummary: 'No tool result implicates the egress proxy.',
      learning: 'Check egress before blaming the provider.',
    };

    beforeEach(() => {
      conversationsGet.mockResolvedValue({ rounds: [savedRound('round-1')] });
      jest.mocked(createOptimizeModel).mockResolvedValue({ inferenceClient: { output } } as never);
      output.mockResolvedValue({
        output: {
          is_feedback_message: verdict.isFeedback,
          causal_confirmed: verdict.causalConfirmed,
          causal_summary: verdict.causalSummary,
          learning: verdict.learning,
        },
      });
    });

    it("checks the round's message and answer on the round's model", async () => {
      await run(followUp);

      await expect(preparedWith().checkCausal!()).resolves.toEqual(verdict);
      expect(createOptimizeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedConnectorId: undefined,
          roundConnectorId: 'round-model',
        })
      );
      const [{ input }] = output.mock.calls[0];
      expect(input).toContain('Human message: It was the egress proxy, per our network team.');
      expect(input).toContain("Investigator's answer: Accepted: the egress proxy.");
    });

    it('omits the pre-follow-up hypotheses snapshot when the follow-up round is not saved yet', async () => {
      conversationsGet.mockResolvedValue({
        rounds: [{ ...savedRound('round-1'), started_at: '2026-11-02T10:00:00.000Z' }],
        attachments: [
          {
            type: 'agentic_investigations_hypotheses',
            versions: [
              {
                created_at: '2026-11-02T10:05:00.000Z',
                data: {
                  hypotheses: [{ candidate: 'egress proxy', status: 'confirmed', reason: 'claim' }],
                },
              },
            ],
          },
        ],
      });

      await run(followUp);
      await preparedWith().checkCausal!();

      const [{ input }] = output.mock.calls[0];
      expect(input).not.toContain('Hypotheses:');
    });

    // A lost verdict must not fail the reinforcement run, nor claim a cause.
    it.each([
      ['the model call fails', () => output.mockRejectedValue(new Error('connector down'))],
      [
        'no model is available',
        () => jest.mocked(createOptimizeModel).mockResolvedValue(undefined),
      ],
    ])('has no verdict when %s', async (_case, arrange) => {
      arrange();
      await run(followUp);

      await expect(preparedWith().checkCausal!()).resolves.toEqual(NO_CAUSAL_VERDICT);
    });

    it('reports the verdict with the prepared turn', async () => {
      jest.mocked(prepareReinforcementTurn).mockResolvedValue({
        skipped: false,
        message: 'turn prompt',
        treeCount: 1,
        turnKind: 'feedback_reinforcement',
        openedTreeIds: [],
        verdict,
      });

      await expect(run(followUp)).resolves.toMatchObject({
        output: {
          causal_check: {
            is_feedback: true,
            causal_confirmed: false,
            causal_summary: verdict.causalSummary,
            learning: verdict.learning,
          },
        },
      });
    });
  });

  // Reading a failure as "no earlier rounds" would let a follow-up seed a stray tree.
  it('fails when the conversation cannot be read', async () => {
    conversationsGet.mockRejectedValue(new Error('cluster unavailable'));

    await expect(run(investigatorRound)).rejects.toThrow('cluster unavailable');
    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
  });
});
