/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { classifyOnlineEvalsRoundStepDefinition } from './classify_online_evals_round';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const RUN_STARTED_AT = '2026-10-27T12:00:00.000Z';
const BEFORE_RUN = '2026-10-27T11:00:00.000Z';
const DURING_RUN = '2026-10-27T12:00:05.000Z';

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: { getFakeRequest: jest.fn().mockReturnValue(request) },
  } as never);

const setup = ({
  rounds = [{ id: 'round-1', started_at: DURING_RUN, steps: [] }],
  paused = false,
  evalsAvailable = true,
}: {
  rounds?: Array<{ id: string; started_at: string; steps: unknown[] }>;
  paused?: boolean;
  evalsAvailable?: boolean;
} = {}) => {
  const get = jest.fn().mockResolvedValue({ id: 'inv-1', rounds });
  const getScopedClient = jest.fn().mockResolvedValue({ get });
  const isPaused = jest.fn().mockReturnValue(paused);
  const definition = classifyOnlineEvalsRoundStepDefinition({
    getAgentBuilder: () =>
      ({ conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart),
    isEvalsAvailable: () => evalsAvailable,
    isPaused,
  });
  const run = (input: Record<string, unknown> = {}) =>
    definition.handler(
      createContext({
        investigation_id: 'inv-1',
        investigation_started_at: RUN_STARTED_AT,
        ...input,
      })
    );

  return { run, get, getScopedClient, isPaused };
};

describe('classifyOnlineEvalsRoundStepDefinition', () => {
  it('scores the initial round of an investigation', async () => {
    const { run, getScopedClient, get } = setup();

    await expect(run()).resolves.toEqual({
      output: {
        should_score: true,
        round_kind: 'initial',
        round_id: 'round-1',
      },
    });
    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(get).toHaveBeenCalledWith('inv-1');
  });

  it('skips a follow-up, such as a question or Slack chatter, until follow-ups are scored', async () => {
    const { run } = setup({
      rounds: [
        { id: 'round-1', started_at: BEFORE_RUN, steps: [] },
        { id: 'round-2', started_at: DURING_RUN, steps: [] },
      ],
    });

    await expect(run({ follow_up: '' })).resolves.toEqual({
      output: {
        should_score: false,
        round_kind: 'follow_up',
        round_id: 'round-2',
        skip_reason: 'follow_up_not_scored',
      },
    });
  });

  it('skips an alert recovery until its verdict is recorded as a field', async () => {
    const { run } = setup({
      rounds: [
        { id: 'round-1', started_at: BEFORE_RUN, steps: [] },
        { id: 'round-2', started_at: DURING_RUN, steps: [] },
      ],
    });

    await expect(run({ follow_up: 'alert_recovered' })).resolves.toEqual({
      output: {
        should_score: false,
        round_kind: 'alert_recovery',
        round_id: 'round-2',
        skip_reason: 'recovery_verdict_unavailable',
      },
    });
  });

  it('skips without reading the investigation when the evals plugin is not loaded', async () => {
    const { run, getScopedClient, isPaused } = setup({ evalsAvailable: false });

    await expect(run()).resolves.toEqual({
      output: { should_score: false, skip_reason: 'evals_unavailable' },
    });
    expect(isPaused).not.toHaveBeenCalled();
    expect(getScopedClient).not.toHaveBeenCalled();
  });

  it('skips without reading the investigation when the kill switch is on', async () => {
    const { run, getScopedClient } = setup({ paused: true });

    await expect(run()).resolves.toEqual({
      output: { should_score: false, skip_reason: 'paused' },
    });
    expect(getScopedClient).not.toHaveBeenCalled();
  });

  it('skips when the investigation has no round', async () => {
    const { run } = setup({ rounds: [] });

    await expect(run()).resolves.toEqual({
      output: { should_score: false, skip_reason: 'no_round' },
    });
  });

  it('fails the step when the investigation cannot be read, so the run records the error', async () => {
    const { run, get } = setup();
    get.mockRejectedValue(new Error('Conversation not found'));

    await expect(run()).rejects.toThrow('Conversation not found');
  });

  it('rejects a run start time that is not a date', async () => {
    const { run, getScopedClient } = setup();

    await expect(run({ investigation_started_at: 'yesterday' })).rejects.toThrow();
    expect(getScopedClient).not.toHaveBeenCalled();
  });
});
