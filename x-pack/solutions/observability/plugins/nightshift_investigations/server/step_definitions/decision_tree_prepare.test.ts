/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { decisionTreePrepareStepDefinition } from './decision_tree_prepare';

jest.mock('../decision_trees/register_decision_trees', () => ({
  prepareReinforcementTurn: jest.fn().mockResolvedValue({ message: 'turn prompt', treeCount: 1 }),
}));

describe('decisionTreePrepareStepDefinition', () => {
  const logger = loggerMock.create();

  const createContext = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'space-1' } }),
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
  });

  it('skips a round with no agent_id rather than trusting it', async () => {
    const result = await run({ prompt: 'why is checkout slow?', response: 'pool leak' });

    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { message: '', tree_count: 0, skipped: true } });
  });

  it('skips a round from another agent', async () => {
    const result = await run({
      prompt: 'why is checkout slow?',
      response: 'pool leak',
      agent_id: 'significant-events.investigation',
    });

    expect(prepareReinforcementTurn).not.toHaveBeenCalled();
    expect(result).toEqual({ output: { message: '', tree_count: 0, skipped: true } });
  });

  it('prepares a reinforcement turn for the Nightshift investigator', async () => {
    const result = await run({
      prompt: 'why is checkout slow?',
      response: 'pool leak',
      agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    });

    expect(prepareReinforcementTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'why is checkout slow?',
        response: 'pool leak',
        spaceId: 'space-1',
      })
    );
    expect(result).toEqual({ output: { message: 'turn prompt', tree_count: 1, skipped: false } });
  });
});
