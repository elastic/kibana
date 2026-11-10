/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { HYPOTHESES_ATTACHMENT_TYPE } from '@kbn/agentic-investigations-plugin/common';
import type { NightshiftTelemetryClient } from '../telemetry';
import { classifyOnlineEvalsRoundStepDefinition } from './classify_online_evals_round';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const RUN_STARTED_AT = '2026-10-27T12:00:00.000Z';
const BEFORE_RUN = '2026-10-27T11:00:00.000Z';
const DURING_RUN = '2026-10-27T12:00:05.000Z';
const END_OF_ROUND_1 = '2026-10-27T11:05:00.000Z';
const END_OF_RUN = '2026-10-27T12:05:00.000Z';

const hypotheses = (...versions: Array<[at: string, status: string]>) => [
  {
    type: HYPOTHESES_ATTACHMENT_TYPE,
    versions: versions.map(([at, status]) => ({
      created_at: at,
      data: { hypotheses: [{ candidate: 'Gateway pool exhaustion', status }] },
    })),
  },
];
const recoveryRounds = [
  { id: 'round-1', started_at: BEFORE_RUN, steps: [] },
  { id: 'round-2', started_at: DURING_RUN, steps: [] },
];

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    logger: { warn: jest.fn() },
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({
        workflow: { spaceId: 'ops' },
        execution: { id: 'investigation-exec-1' },
      }),
    },
  } as never);

const setup = ({
  rounds = [{ id: 'round-1', started_at: DURING_RUN, steps: [] }],
  attachments,
  paused = false,
  evalsAvailable = true,
  agentBuilderAvailable = true,
}: {
  rounds?: Array<{ id: string; started_at: string; steps: unknown[] }>;
  attachments?: ReturnType<typeof hypotheses>;
  paused?: boolean;
  evalsAvailable?: boolean;
  agentBuilderAvailable?: boolean;
} = {}) => {
  const get = jest.fn().mockResolvedValue({ id: 'inv-1', rounds, attachments });
  const getScopedClient = jest.fn().mockResolvedValue({ get });
  const isPaused = jest.fn().mockReturnValue(paused);
  const reportOnlineEvalsStepFailed = jest.fn();
  const definition = classifyOnlineEvalsRoundStepDefinition({
    getAgentBuilder: () =>
      agentBuilderAvailable
        ? ({ conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart)
        : undefined,
    isEvalsAvailable: () => evalsAvailable,
    isPaused,
    telemetry: { reportOnlineEvalsStepFailed } as unknown as NightshiftTelemetryClient,
  });
  const run = (input: Record<string, unknown> = {}) =>
    definition.handler(
      createContext({
        investigation_id: 'inv-1',
        investigation_started_at: RUN_STARTED_AT,
        ...input,
      })
    );

  return { run, get, getScopedClient, isPaused, reportOnlineEvalsStepFailed };
};

describe('classifyOnlineEvalsRoundStepDefinition', () => {
  it('scores the initial round of an investigation', async () => {
    const { run, getScopedClient, get } = setup();

    await expect(run()).resolves.toEqual({
      output: {
        should_score: true,
        round_kind: 'initial',
        round_id: 'round-1',
        root_cause_outcome: 'unknown',
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
        root_cause_outcome: 'unknown',
        skip_reason: 'follow_up_not_scored',
      },
    });
  });

  it('scores an alert recovery that leaves the root cause confirmed', async () => {
    const { run } = setup({
      rounds: recoveryRounds,
      attachments: hypotheses([END_OF_ROUND_1, 'confirmed'], [END_OF_RUN, 'confirmed']),
    });

    await expect(run({ follow_up: 'alert_recovered' })).resolves.toEqual({
      output: {
        should_score: true,
        round_kind: 'alert_recovery',
        round_id: 'round-2',
        root_cause_outcome: 'unchanged',
      },
    });
  });

  it('skips an alert recovery that leaves no confirmed root cause to grade against', async () => {
    const { run } = setup({
      rounds: recoveryRounds,
      attachments: hypotheses([END_OF_ROUND_1, 'confirmed'], [END_OF_RUN, 'dismissed']),
    });

    await expect(run({ follow_up: 'alert_recovered' })).resolves.toEqual({
      output: {
        should_score: false,
        round_kind: 'alert_recovery',
        round_id: 'round-2',
        root_cause_outcome: 'withdrawn',
        skip_reason: 'recovery_unresolved',
      },
    });
  });

  it('scores an alert recovery the recorder wrote no hypotheses for, for the judges to decide', async () => {
    const { run } = setup({
      rounds: recoveryRounds,
      attachments: hypotheses([END_OF_ROUND_1, 'investigating']),
    });

    await expect(run({ follow_up: 'alert_recovered' })).resolves.toEqual({
      output: {
        should_score: true,
        round_kind: 'alert_recovery',
        round_id: 'round-2',
        root_cause_outcome: 'unknown',
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

  it('reports a failure to read the investigation and skips the round, without failing the investigation', async () => {
    const { run, get, reportOnlineEvalsStepFailed } = setup();
    get.mockRejectedValue(new Error('Conversation inv-1 not found'));

    await expect(run()).resolves.toEqual({
      output: { should_score: false, skip_reason: 'classification_failed' },
    });
    expect(reportOnlineEvalsStepFailed).toHaveBeenCalledWith({
      step: 'classify_round',
      code: 'investigation_unavailable',
      investigation_id: 'inv-1',
      workflow_execution_id: 'investigation-exec-1',
      space_id: 'ops',
    });
  });

  it('reports Agent Builder being unavailable and skips the round', async () => {
    const { run, reportOnlineEvalsStepFailed } = setup({ agentBuilderAvailable: false });

    await expect(run()).resolves.toEqual({
      output: { should_score: false, skip_reason: 'classification_failed' },
    });
    expect(reportOnlineEvalsStepFailed).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'classify_round', code: 'agent_builder_unavailable' })
    );
  });

  it('reports invalid input and skips the round, without reading the investigation', async () => {
    const { run, getScopedClient, reportOnlineEvalsStepFailed } = setup();

    await expect(run({ investigation_started_at: 'yesterday' })).resolves.toEqual({
      output: { should_score: false, skip_reason: 'classification_failed' },
    });
    expect(getScopedClient).not.toHaveBeenCalled();
    expect(reportOnlineEvalsStepFailed).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'classify_round', code: 'invalid_input' })
    );
  });
});
