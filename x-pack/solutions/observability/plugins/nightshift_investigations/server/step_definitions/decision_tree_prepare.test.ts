/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { checkCausalConfirmation } from '../decision_trees/causal_check';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { decisionTreePrepareStepDefinition } from './decision_tree_prepare';

jest.mock('../lib/create_optimize_model', () => ({ createOptimizeModel: jest.fn() }));
jest.mock('../decision_trees/causal_check', () => ({ checkCausalConfirmation: jest.fn() }));

jest.mock('../decision_trees/register_decision_trees', () => ({
  prepareReinforcementTurn: jest.fn().mockResolvedValue({
    message: 'turn prompt',
    treeCount: 1,
    turnKind: 'feedback_reinforcement',
  }),
}));

describe('decisionTreePrepareStepDefinition', () => {
  const logger = loggerMock.create();

  const createContext = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest
          .fn()
          .mockReturnValue({ workflow: { spaceId: 'space-1' }, execution: { id: 'exec-1' } }),
        getFakeRequest: jest.fn(),
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
      getTelemetryConnectorId: () => undefined,
      logger,
    }).handler(createContext(input));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createOptimizeModel).mockResolvedValue(undefined);
  });

  it('skips a round with no agent_id rather than trusting it', async () => {
    const result = await run({ response: 'pool leak' });

    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: { message: '', tree_count: 0, turn_kind: 'initial_investigation', skipped: true },
    });
  });

  it('skips a round from another agent', async () => {
    const result = await run({
      response: 'pool leak',
      agent_id: 'significant-events.investigation',
    });

    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: { message: '', tree_count: 0, turn_kind: 'initial_investigation', skipped: true },
    });
  });

  it('prepares a reinforcement turn for the Nightshift investigator', async () => {
    const result = await run({
      response: 'pool leak',
      agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    });

    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        response: 'pool leak',
        spaceId: 'space-1',
      })
    );
    expect(result).toEqual({
      output: {
        message: 'turn prompt',
        tree_count: 1,
        turn_kind: 'feedback_reinforcement',
        skipped: false,
      },
    });
  });
  describe('causal check', () => {
    const replyUserCall = {
      tool_id: 'reply_user',
      params: { response: 'Root cause: the 01:00 deploy doubled DB latency.' },
    };

    // The conversation has two rounds: r0 started the investigation, r1 is a person's follow-up.
    const agentBuilderWithRounds = () =>
      ({
        conversations: {
          getScopedClient: async () => ({
            get: async () => ({ rounds: [{ id: 'r0' }, { id: 'r1' }] }),
          }),
        },
      } as never);

    const runWithModel = (input: Record<string, unknown>) =>
      decisionTreePrepareStepDefinition({
        getTelemetryConnectorId: () => undefined,
        getAgentBuilder: agentBuilderWithRounds,
        getInference: () => ({} as never),
        getSavedObjects: () => ({} as never),
        getUiSettings: () => ({} as never),
        logger,
      }).handler(
        createContext({
          response: 'Done.',
          prompt: 'The cause was the deploy.',
          agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
          conversation_id: 'c1',
          round_id: 'r1',
          ...input,
        })
      );

    beforeEach(() => {
      jest
        .mocked(createOptimizeModel)
        .mockResolvedValue({ inferenceClient: { output: jest.fn() } } as never);
    });

    it("uses the reply_user answer, not the round's closing message, and the check's verdict", async () => {
      jest.mocked(checkCausalConfirmation).mockResolvedValue({
        isFeedbackMessage: true,
        causalConfirmed: true,
        causalSummary: 'x',
        learning: '',
      });

      await runWithModel({ tool_calls: [replyUserCall] });

      expect(prepareReinforcementTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          response: 'Root cause: the 01:00 deploy doubled DB latency.',
          causalConfirmed: true,
        })
      );
      expect(jest.mocked(checkCausalConfirmation).mock.calls[0][0].transcript).toContain(
        'The cause was the deploy.'
      );
    });

    it('keeps the text match when the check says no, so a stated confirmation is not lost', async () => {
      jest.mocked(checkCausalConfirmation).mockResolvedValue({
        isFeedbackMessage: false,
        causalConfirmed: false,
        causalSummary: '',
        learning: '',
      });

      await runWithModel({
        tool_calls: [{ tool_id: 'reply_user', params: { response: 'status: confirmed' } }],
      });

      expect(prepareReinforcementTurn).toHaveBeenCalledWith(
        expect.objectContaining({ causalConfirmed: true })
      );
    });

    it('falls back to the text match when the check cannot run', async () => {
      jest.mocked(checkCausalConfirmation).mockResolvedValue(undefined);

      await runWithModel({ tool_calls: [replyUserCall] });

      expect(prepareReinforcementTurn).toHaveBeenCalledWith(
        expect.objectContaining({ causalConfirmed: false })
      );
    });

    it('does not check a first round: there is no ground truth yet', async () => {
      await runWithModel({
        round_id: 'r0',
        tool_calls: [{ tool_id: 'reply_user', params: { response: 'status: confirmed' } }],
      });

      expect(checkCausalConfirmation).not.toHaveBeenCalled();
      expect(prepareReinforcementTurn).toHaveBeenCalledWith(
        expect.objectContaining({ causalConfirmed: false })
      );
    });

    it('treats a round it cannot place in its conversation as a first round', async () => {
      await runWithModel({ conversation_id: undefined, tool_calls: [replyUserCall] });

      expect(checkCausalConfirmation).not.toHaveBeenCalled();
    });

    it('does not fail the round when the model cannot be loaded', async () => {
      jest.mocked(createOptimizeModel).mockRejectedValue(new Error('no connector'));

      await expect(runWithModel({ tool_calls: [replyUserCall] })).resolves.toMatchObject({
        output: { skipped: false },
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no connector'));
    });
  });
});
