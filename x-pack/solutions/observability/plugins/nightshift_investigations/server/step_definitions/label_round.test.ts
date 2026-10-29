/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { labelRoundStepDefinition } from './label_round';

describe('labelRoundStepDefinition', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggerMock.create();
  const getRoundKind = jest.fn();

  const run = (input: Record<string, unknown>, { enabled = true } = {}) =>
    labelRoundStepDefinition({ getRoundKind, isEnabled: () => enabled }).handler({
      input,
      rawInput: input,
      contextManager: { getFakeRequest: jest.fn().mockReturnValue(request) },
      logger,
      abortSignal: new AbortController().signal,
      stepId: 'label_round',
      stepType: 'nightshift.labelRound',
    } as never);

  const investigatorRound = {
    conversation_id: 'inv-1',
    agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRoundKind.mockResolvedValue('alert_recovery');
  });

  it('labels the round with the kind its run declared', async () => {
    await expect(run(investigatorRound)).resolves.toEqual({
      output: { round_kind: 'alert_recovery' },
    });
    expect(getRoundKind).toHaveBeenCalledWith(request, 'inv-1');
  });

  // A failed before-agent workflow aborts the round; the post-round reinforcement fails instead.
  it('leaves the round unlabelled, without failing it, when the kind cannot be read', async () => {
    getRoundKind.mockRejectedValue(new Error('declares no round_kind'));

    await expect(run(investigatorRound)).resolves.toEqual({ output: {} });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('declares no round_kind'));
  });

  it.each([
    ['decision trees are off', investigatorRound, false],
    ['the round is from another agent', { ...investigatorRound, agent_id: 'other' }, true],
    ['the round has no conversation', { ...investigatorRound, conversation_id: '' }, true],
  ])('reads nothing when %s', async (_case, input, enabled) => {
    await expect(run(input, { enabled })).resolves.toEqual({ output: {} });
    expect(getRoundKind).not.toHaveBeenCalled();
  });
});
