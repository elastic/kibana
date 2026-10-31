/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EvaluateFn } from '@kbn/evals-plugin/server';
import {
  MEMORY_READ_JUDGE_VERSION,
  MEMORY_WRITE_JUDGE_VERSION,
  memoryReadJudge,
  memoryWriteJudge,
  READ_JUDGE_EVALUATOR_NAME,
  WRITE_JUDGE_EVALUATOR_NAME,
} from '../online_evals/judges';
import type { NightshiftTelemetryClient } from '../telemetry';
import {
  MEMORY_EVALUATOR_SET,
  scoreMemoryOnlineEvalsStepDefinition,
  shouldSampleRound,
} from './score_memory_online_evals';

const request = {} as KibanaRequest;

const ROUND = {
  id: 'round-uuid-1',
  started_at: '2026-10-30T10:00:00.000Z',
  ended_at: '2026-10-30T10:01:30.000Z',
  trace_id: '22222222222222222222222222222222',
  input: { message: 'Why did the checkout alert fire?' },
  response: { message: 'Checkout DB connection pool exhausted.' },
  steps: [
    {
      type: 'tool_call',
      tool_call_id: 'call-1',
      tool_id: 'nightshift_sandbox_view_file',
      params: { path: '/workspace/memories/mem-1.md' },
      results: [{ type: 'other', data: { content: 'Memory 1' } }],
    },
  ],
};

const setup = ({
  evaluate = jest.fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>(async (params) => {
    const results = [];
    for (const ev of params.evaluators) {
      if (ev.name === READ_JUDGE_EVALUATOR_NAME) {
        const res = await memoryReadJudge.evaluate({
          round: params.evidence!.round as never,
          referenceData: params.evidence!.reference_data as never,
          log: loggingSystemMock.createLogger(),
        });
        results.push({
          status: 'ok' as const,
          evaluator: {
            name: READ_JUDGE_EVALUATOR_NAME,
            version: MEMORY_READ_JUDGE_VERSION,
            kind: 'code' as const,
            direction: 'maximize' as const,
          },
          scores: res.scores,
        });
      }
      if (ev.name === WRITE_JUDGE_EVALUATOR_NAME) {
        const res = await memoryWriteJudge.evaluate({
          round: params.evidence!.round as never,
          referenceData: params.evidence!.reference_data as never,
          log: loggingSystemMock.createLogger(),
        });
        results.push({
          status: 'ok' as const,
          evaluator: {
            name: WRITE_JUDGE_EVALUATOR_NAME,
            version: MEMORY_WRITE_JUDGE_VERSION,
            kind: 'code' as const,
            direction: 'maximize' as const,
          },
          scores: res.scores,
        });
      }
    }
    return results;
  }),
  evalsAvailable = true,
  enabled = true,
  paused = false,
  includeExplanations = false,
  rounds = [ROUND],
}: {
  evaluate?: jest.Mock<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>;
  evalsAvailable?: boolean;
  enabled?: boolean;
  paused?: boolean;
  includeExplanations?: boolean;
  rounds?: unknown[];
} = {}) => {
  const get = jest
    .fn()
    .mockResolvedValue({ id: 'inv-1', agent_id: 'nightshift-investigator', rounds });
  const getScopedClient = jest.fn().mockResolvedValue({ get });
  const reportOnlineEvalScore = jest.fn();
  const logger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() };
  const definition = scoreMemoryOnlineEvalsStepDefinition({
    getAgentBuilder: () =>
      ({ conversations: { getScopedClient } } as unknown as AgentBuilderPluginStart),
    getEvaluate: () => (evalsAvailable ? evaluate : undefined),
    isPaused: () => paused,
    shouldIncludeExplanations: () => includeExplanations,
    telemetry: { reportOnlineEvalScore } as unknown as NightshiftTelemetryClient,
    logger: logger as unknown as Logger,
    isEnabled: () => enabled,
  });

  const run = (input: Record<string, unknown> = {}) =>
    definition.handler({
      input: {
        conversation_id: 'inv-1',
        round_id: 'last',
        agent_id: 'nightshift-investigator',
        background_trace_id: '11111111111111111111111111111111',
        recalled_ids: ['memory_mem-1', 'memory_mem-2'],
        cortex_opened_ids: ['cortex-1'],
        memory_opened_ids: ['memory_mem-1'],
        cortex_applied_writes: [
          {
            store: 'cortex',
            item_id: 'payments-service',
            action: 'upsert',
            version: 2,
            before_content: '# Old',
            after_content: '# New',
          },
        ],
        ...input,
      },
      logger,
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(request),
        getContext: jest.fn().mockReturnValue({
          workflow: { spaceId: 'ops' },
          execution: { id: 'optimize-exec-1' },
        }),
      },
    } as never);

  return { run, evaluate, get, getScopedClient, reportOnlineEvalScore, logger };
};

describe('scoreMemoryOnlineEvalsStepDefinition', () => {
  it('scores recalled/opened items and applied writes via evals.evaluate() and emits the EBT event without item IDs in score names', async () => {
    const { run, evaluate, reportOnlineEvalScore } = setup();

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 0, skipped_count: 0 },
    });

    expect(evaluate).toHaveBeenCalledWith({
      request,
      spaceId: 'ops',
      evaluators: [
        { name: READ_JUDGE_EVALUATOR_NAME, version: MEMORY_READ_JUDGE_VERSION },
        { name: WRITE_JUDGE_EVALUATOR_NAME, version: MEMORY_WRITE_JUDGE_VERSION },
      ],
      evidence: {
        round: {
          input: { message: 'Why did the checkout alert fire?' },
          steps: [
            {
              tool_call_id: 'call-1',
              tool_id: 'nightshift_sandbox_view_file',
              arguments: { path: '/workspace/memories/mem-1.md' },
              result: [{ type: 'other', data: { content: 'Memory 1' } }],
            },
          ],
          response: { message: 'Checkout DB connection pool exhausted.' },
        },
        reference_data: {
          recalled_ids: ['memory_mem-1', 'memory_mem-2'],
          opened_ids: ['cortex-1', 'memory_mem-1'],
          applied_writes: [
            {
              store: 'cortex',
              item_id: 'payments-service',
              action: 'upsert',
              version: 2,
              before_content: '# Old',
              after_content: '# New',
            },
          ],
        },
      },
    });

    expect(reportOnlineEvalScore).toHaveBeenCalledTimes(1);
    const [event] = reportOnlineEvalScore.mock.calls[0];
    expect(event).toEqual(
      expect.objectContaining({
        investigation_id: 'inv-1',
        round_id: 'round-uuid-1',
        round_trace_id: '22222222222222222222222222222222',
        judge_trace_id: '11111111111111111111111111111111',
        workflow_execution_id: 'optimize-exec-1',
        space_id: 'ops',
        agent_id: 'nightshift-investigator',
        evaluator_set: MEMORY_EVALUATOR_SET,
        round_kind: 'initial',
        graded_report: 'current',
        explanations_included: false,
        evaluator_count: 2,
        failed_count: 0,
        skipped_count: 0,
        scores: [
          {
            evaluator_name: READ_JUDGE_EVALUATOR_NAME,
            evaluator_version: MEMORY_READ_JUDGE_VERSION,
            name: 'memory_read_utility',
            value: 0.5,
            label: 'RECALLED_OPENED',
          },
          {
            evaluator_name: WRITE_JUDGE_EVALUATOR_NAME,
            evaluator_version: MEMORY_WRITE_JUDGE_VERSION,
            name: 'memory_write_quality',
            value: 1,
            label: 'cortex:1/1',
          },
        ],
      })
    );
    expect(event).not.toHaveProperty('investigation_execution_id');
    expect(JSON.stringify(event)).not.toContain('payments-service');
  });

  it('includes explanations when shouldIncludeExplanations is true', async () => {
    const { run, reportOnlineEvalScore } = setup({ includeExplanations: true });

    await run();

    expect(reportOnlineEvalScore.mock.calls[0][0].scores).toEqual([
      expect.objectContaining({
        name: 'memory_read_utility',
        explanation: 'Agent opened 1 of 2 recalled/hydrated items.',
      }),
      expect.objectContaining({
        name: 'memory_write_quality',
        explanation: '1 of 1 cortex writes had content.',
      }),
    ]);
  });

  it('reports failed evaluators without failing the step when evaluate() throws', async () => {
    const evaluate = jest
      .fn<ReturnType<EvaluateFn>, Parameters<EvaluateFn>>()
      .mockRejectedValue(new Error('Evaluation failed'));
    const { run, reportOnlineEvalScore } = setup({ evaluate });

    await expect(run()).resolves.toEqual({
      output: { scored: true, evaluator_count: 2, failed_count: 2, skipped_count: 0 },
    });
    expect(reportOnlineEvalScore.mock.calls[0][0].errors).toEqual([
      {
        evaluator_name: READ_JUDGE_EVALUATOR_NAME,
        evaluator_version: MEMORY_READ_JUDGE_VERSION,
        code: 'evaluator_error',
      },
      {
        evaluator_name: WRITE_JUDGE_EVALUATOR_NAME,
        evaluator_version: MEMORY_WRITE_JUDGE_VERSION,
        code: 'evaluator_error',
      },
    ]);
  });

  it('skips when disabled, paused, evals_unavailable, nothing_to_score, or not_sampled', async () => {
    await expect(setup({ enabled: false }).run()).resolves.toEqual({
      output: { scored: false, skip_reason: 'disabled' },
    });
    await expect(setup({ evalsAvailable: false }).run()).resolves.toEqual({
      output: { scored: false, skip_reason: 'evals_unavailable' },
    });
    await expect(setup({ paused: true }).run()).resolves.toEqual({
      output: { scored: false, skip_reason: 'paused' },
    });
    await expect(
      setup({ rounds: [{ ...ROUND, steps: [] }] }).run({
        recalled_ids: [],
        cortex_opened_ids: [],
        memory_opened_ids: [],
        cortex_applied_writes: [],
      })
    ).resolves.toEqual({
      output: { scored: false, skip_reason: 'nothing_to_score' },
    });
    await expect(setup().run({ sample_rate: 0 })).resolves.toEqual({
      output: { scored: false, skip_reason: 'not_sampled' },
    });
  });

  it('shouldSampleRound is deterministic', () => {
    expect(shouldSampleRound('seed-1', 1)).toBe(true);
    expect(shouldSampleRound('seed-1', 0)).toBe(false);
    expect(shouldSampleRound('seed-1', 0.5)).toBe(shouldSampleRound('seed-1', 0.5));
  });
});
