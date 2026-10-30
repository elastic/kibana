/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { EvaluateFn } from '@kbn/evals-plugin/server';
import type { NightshiftTelemetryClient } from '../telemetry';
import type { EvaluateResult } from '../online_evals/build_score_event';
import { scoreOnlineEvalsRoundStepDefinition } from './score_online_evals_round';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;

const ROUND = {
  id: 'round-1',
  started_at: '2026-10-29T10:00:00.000Z',
  time_to_last_token: 120_000,
  trace_id: 'trace-round-1',
  input: { message: 'Why did the checkout alert fire?' },
  response: { message: 'A bad deploy of the payments service.' },
  steps: [
    {
      type: 'tool_call',
      tool_call_id: 'call-1',
      tool_id: 'nightshift_sandbox_bash',
      params: { command: 'kubectl get pods' },
      results: [{ type: 'other', data: { stdout: 'payments CrashLoopBackOff' } }],
    },
  ],
};

const okResult = (name: string): EvaluateResult => ({
  status: 'ok',
  evaluator: { name, version: '1.0.0', kind: 'llm', model: { id: 'judge-model' } },
  scores: [{ name: 'quality', score: 0.8, label: 'GOOD', explanation: 'Cause is supported.' }],
});

const INPUT = {
  investigation_id: 'inv-1',
  round_id: 'round-1',
  round_kind: 'initial',
  graded_report: 'first_round',
  evaluator_set: 'reference_free',
  evaluators: [{ name: 'conclusion_quality' }, { name: 'rca_reward', version: '1.0.0' }],
  judge_connector_id: 'judge-connector',
  investigation_started_at: '2026-10-29T09:59:58.000Z',
  investigation_execution_id: 'investigation-exec-1',
  entry_point: 'automation',
};

const setup = ({
  evaluate = jest.fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>(),
  evalsAvailable = true,
  paused = false,
  includeExplanations = false,
  rounds = [ROUND],
}: {
  evaluate?: jest.Mock<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>;
  evalsAvailable?: boolean;
  paused?: boolean;
  includeExplanations?: boolean;
  rounds?: unknown[];
} = {}) => {
  const get = jest.fn().mockResolvedValue({ id: 'inv-1', agent_id: 'investigator', rounds });
  const getScopedClient = jest.fn().mockResolvedValue({ get });
  const reportOnlineEvalScore = jest.fn();
  const logger = { warn: jest.fn() };
  const definition = scoreOnlineEvalsRoundStepDefinition({
    getAgentBuilder: () =>
      ({ conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart),
    getEvaluate: () => (evalsAvailable ? evaluate : undefined),
    isPaused: () => paused,
    shouldIncludeExplanations: () => includeExplanations,
    telemetry: { reportOnlineEvalScore } as unknown as NightshiftTelemetryClient,
  });
  const run = (input: Record<string, unknown> = {}) =>
    definition.handler({
      input: { ...INPUT, ...input },
      logger,
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(request),
        getContext: jest.fn().mockReturnValue({
          workflow: { spaceId: 'ops' },
          execution: { id: 'scoring-exec-1' },
        }),
      },
    } as never);

  return { run, evaluate, get, getScopedClient, reportOnlineEvalScore, logger };
};

describe('scoreOnlineEvalsRoundStepDefinition', () => {
  it('scores the round with every evaluator on the judge connector and reports the event', async () => {
    const evaluate = jest
      .fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>()
      .mockResolvedValue([okResult('conclusion_quality'), okResult('rca_reward')]);
    const { run, reportOnlineEvalScore, get } = setup({ evaluate });

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 0, skipped_count: 0 },
    });

    expect(get).toHaveBeenCalledWith('inv-1');
    expect(evaluate).toHaveBeenCalledWith({
      request,
      evidence: {
        round: {
          input: { message: 'Why did the checkout alert fire?' },
          steps: [
            {
              tool_call_id: 'call-1',
              tool_id: 'nightshift_sandbox_bash',
              arguments: { command: 'kubectl get pods' },
              result: [{ type: 'other', data: { stdout: 'payments CrashLoopBackOff' } }],
            },
          ],
          response: { message: 'A bad deploy of the payments service.' },
        },
      },
      evaluators: [
        { name: 'conclusion_quality', connector_id: 'judge-connector' },
        { name: 'rca_reward', version: '1.0.0', connector_id: 'judge-connector' },
      ],
    });
    expect(reportOnlineEvalScore).toHaveBeenCalledWith(
      expect.objectContaining({
        investigation_id: 'inv-1',
        round_id: 'round-1',
        round_trace_id: 'trace-round-1',
        workflow_execution_id: 'scoring-exec-1',
        investigation_execution_id: 'investigation-exec-1',
        space_id: 'ops',
        agent_id: 'investigator',
        evaluator_set: 'reference_free',
        round_kind: 'initial',
        graded_report: 'first_round',
        entry_point: 'automation',
        judge_connector_id: 'judge-connector',
        judge_model: 'judge-model',
        investigation_started_at: '2026-10-29T09:59:58.000Z',
        investigation_ended_at: '2026-10-29T10:02:00.000Z',
        scoring_duration_ms: expect.any(Number),
        evaluator_count: 2,
        explanations_included: false,
      })
    );
    expect(reportOnlineEvalScore.mock.calls[0][0].scores[0]).not.toHaveProperty('explanation');
  });

  it('includes explanations when the flag is on', async () => {
    const evaluate = jest
      .fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>()
      .mockResolvedValue([okResult('conclusion_quality')]);
    const { run, reportOnlineEvalScore } = setup({ evaluate, includeExplanations: true });

    await run({ evaluators: [{ name: 'conclusion_quality' }] });

    expect(reportOnlineEvalScore.mock.calls[0][0].scores[0].explanation).toBe(
      'Cause is supported.'
    );
  });

  it('reports a partial failure without failing the step', async () => {
    const evaluate = jest.fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>().mockResolvedValue([
      okResult('conclusion_quality'),
      {
        status: 'error',
        evaluator: { name: 'rca_reward', version: '1.0.0', kind: 'llm' },
        error: { message: 'Judge timed out' },
      },
    ]);
    const { run, reportOnlineEvalScore } = setup({ evaluate });

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 1, skipped_count: 0 },
    });
    expect(reportOnlineEvalScore.mock.calls[0][0].errors).toEqual([
      { evaluator_name: 'rca_reward', evaluator_version: '1.0.0', code: 'evaluator_error' },
    ]);
  });

  it('reports every evaluator as failed when the evaluation throws, without failing the step', async () => {
    const evaluate = jest
      .fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>()
      .mockRejectedValue(new Error('connector_id is required'));
    const { run, reportOnlineEvalScore, logger } = setup({ evaluate });

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 2, skipped_count: 0 },
    });
    const [event] = reportOnlineEvalScore.mock.calls[0];
    expect(event.scores).toEqual([]);
    expect(event.errors).toEqual([
      { evaluator_name: 'conclusion_quality', code: 'evaluation_failed' },
      { evaluator_name: 'rca_reward', evaluator_version: '1.0.0', code: 'evaluation_failed' },
    ]);
    expect(JSON.stringify(event)).not.toContain('connector_id is required');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connector_id is required'));
  });

  it('reports a failed evaluation when the round is not in the investigation', async () => {
    const { run, evaluate, reportOnlineEvalScore } = setup({ rounds: [] });

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 2, skipped_count: 0 },
    });
    expect(evaluate).not.toHaveBeenCalled();
    expect(reportOnlineEvalScore.mock.calls[0][0]).not.toHaveProperty('investigation_ended_at');
  });

  it("still scores a round whose end time can't be worked out", async () => {
    const evaluate = jest
      .fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>()
      .mockResolvedValue([okResult('conclusion_quality')]);
    const { run, reportOnlineEvalScore } = setup({
      evaluate,
      rounds: [{ ...ROUND, time_to_last_token: undefined }],
    });

    await expect(run({ evaluators: [{ name: 'conclusion_quality' }] })).resolves.toEqual({
      output: { scored: true, evaluator_count: 1, failed_count: 0, skipped_count: 0 },
    });
    expect(reportOnlineEvalScore.mock.calls[0][0]).not.toHaveProperty('investigation_ended_at');
  });

  it('sends nothing when the kill switch is on', async () => {
    const { run, getScopedClient, evaluate, reportOnlineEvalScore } = setup({ paused: true });

    await expect(run()).resolves.toEqual({ output: { scored: false, skip_reason: 'paused' } });
    expect(getScopedClient).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
    expect(reportOnlineEvalScore).not.toHaveBeenCalled();
  });

  it('sends nothing when the evals plugin is not loaded', async () => {
    const { run, reportOnlineEvalScore } = setup({ evalsAvailable: false });

    await expect(run()).resolves.toEqual({
      output: { scored: false, skip_reason: 'evals_unavailable' },
    });
    expect(reportOnlineEvalScore).not.toHaveBeenCalled();
  });

  it('rejects more evaluators than one evaluation runs in parallel', async () => {
    const { run, reportOnlineEvalScore } = setup();

    await expect(
      run({ evaluators: ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name })) })
    ).rejects.toThrow();
    expect(reportOnlineEvalScore).not.toHaveBeenCalled();
  });
});
