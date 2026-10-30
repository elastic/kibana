/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { RECORD_RECOVERY_OUTCOME_TOOL_ID } from '../round_verdict';
import { classifyFollowUpStepDefinition, type CreateCausalCheck } from './classify_follow_up';

describe('classifyFollowUpStepDefinition', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  const conversationsGet = jest.fn();
  const agentBuilder = {
    conversations: { getScopedClient: jest.fn().mockResolvedValue({ get: conversationsGet }) },
  };
  const runCausalCheck = jest.fn();
  const createCausalCheck = jest.fn<ReturnType<CreateCausalCheck>, Parameters<CreateCausalCheck>>();

  const createContext = (input: Record<string, unknown>) =>
    ({
      input: { prompt: 'it was the deploy', response: 'Confirmed.', ...input },
      contextManager: {
        getContext: jest.fn().mockReturnValue({ execution: { id: 'exec-1' } }),
        getFakeRequest: jest.fn().mockReturnValue(request),
      },
      logger,
      abortSignal: new AbortController().signal,
    } as never);

  const run = (input: Record<string, unknown>, { isEnabled }: { isEnabled?: () => boolean } = {}) =>
    classifyFollowUpStepDefinition({
      getAgentBuilder: () => agentBuilder as never,
      createCausalCheck,
      isEnabled,
    }).handler(createContext(input));

  const round = {
    agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    conversation_id: 'inv-1',
    round_id: 'round-2',
    round_kind: 'follow_up',
  };
  const noVerdict = {
    is_feedback: false,
    causal_confirmed: false,
    causal_summary: '',
    learning: '',
    source: 'none',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createCausalCheck.mockResolvedValue(runCausalCheck);
    runCausalCheck.mockResolvedValue({
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: 'The deploy caused it.',
      learning: 'Check deploys first.',
    });
    conversationsGet.mockResolvedValue({
      rounds: [
        { id: 'round-1', input: { message: 'Alert' }, response: { message: 'Pool.' }, steps: [] },
        { id: 'round-2', input: { message: 'stale' }, response: { message: 'stale' }, steps: [] },
      ],
    });
  });

  it('gives no verdict when the feature is off or the round is not an investigation', async () => {
    await expect(run(round, { isEnabled: () => false })).resolves.toEqual({ output: noVerdict });
    await expect(run({ ...round, agent_id: 'other' })).resolves.toEqual({ output: noVerdict });
    expect(createCausalCheck).not.toHaveBeenCalled();
  });

  // prepare_turn fails the run for this; Cortex and Memory run before it and must still run.
  it('gives a round with no kind no verdict rather than failing', async () => {
    await expect(run({ ...round, round_kind: '' })).resolves.toEqual({ output: noVerdict });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has no round kind'));
  });

  it('checks a follow-up against the earlier rounds, and this round from its inputs', async () => {
    await expect(run({ ...round, round_connector_id: 'claude' })).resolves.toEqual({
      output: {
        round_kind: 'follow_up',
        is_feedback: true,
        causal_confirmed: true,
        causal_summary: 'The deploy caused it.',
        learning: 'Check deploys first.',
        source: 'causal_check',
      },
    });

    expect(createCausalCheck).toHaveBeenCalledWith(
      expect.objectContaining({ request, roundConnectorId: 'claude', interactionId: 'exec-1' })
    );
    const transcript: string = runCausalCheck.mock.calls[0][0];
    expect(transcript).toContain('Message: Alert');
    expect(transcript).not.toContain('stale');
    expect(transcript).toContain('Human message: it was the deploy');
  });

  it('reads a recovery round from its recorded outcome without an LLM call', async () => {
    const result = await run({
      ...round,
      round_kind: 'alert_recovery',
      tool_calls: [
        {
          tool_id: RECORD_RECOVERY_OUTCOME_TOOL_ID,
          tool_call_id: 'c1',
          params: {
            verdict: 'contradicted',
            resolved_by: 'self_resolved',
            resolution: 'Errors stopped while 2.14.0 was still running.',
            hypotheses: [{ candidate: 'inventory 2.14.0 rollout', outcome: 'contradicted' }],
          },
        },
      ],
    });

    expect(result).toMatchObject({
      output: {
        round_kind: 'alert_recovery',
        is_feedback: true,
        causal_confirmed: false,
        source: 'recovery_outcome',
      },
    });
    expect(createCausalCheck).not.toHaveBeenCalled();
  });

  it('gives no verdict, rather than failing, when the causal check fails', async () => {
    runCausalCheck.mockRejectedValue(new Error('model overloaded'));

    await expect(run(round)).resolves.toEqual({
      output: { round_kind: 'follow_up', ...noVerdict },
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('model overloaded'));
  });

  it('gives no verdict when no model is available', async () => {
    createCausalCheck.mockResolvedValue(undefined);

    await expect(run(round)).resolves.toEqual({
      output: { round_kind: 'follow_up', ...noVerdict },
    });
  });
});
