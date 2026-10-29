/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvalsExecutorClient } from '@kbn/evals';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  analysisRunMetricEvaluators,
  readAnalysisRunMetrics,
  reportAnalysisRunMetrics,
} from './report_run_metrics';

const step = (overrides: Record<string, unknown> = {}) =>
  ({
    stepId: 'forensic_analysis',
    stepType: 'ai.agent',
    status: 'completed',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:00:42.500Z',
    output: {
      structured_output: { verdict: 'confirmed_incident' },
      metadata: {
        usage: { connectorId: 'eis-haiku', inputTokens: 1200, outputTokens: 300, cachedTokens: 0 },
      },
    },
    ...overrides,
  } as unknown as WorkflowStepExecutionDto);

const scoreOf = async (name: string, metadata: Record<string, unknown>) => {
  const evaluator = analysisRunMetricEvaluators.find((candidate) => candidate.name === name);
  return evaluator?.evaluate({ input: {}, output: null, expected: null, metadata });
};

describe('readAnalysisRunMetrics', () => {
  it('reads usage from the step output and prefers the engine-recorded execution time', () => {
    expect(readAnalysisRunMetrics(step({ executionTimeMs: 40_000 }))).toEqual({
      connectorId: 'eis-haiku',
      inputTokens: 1200,
      outputTokens: 300,
      cachedTokens: 0,
      latencySeconds: 40,
    });
  });

  it('falls back to the step timestamps when no execution time was recorded', () => {
    expect(readAnalysisRunMetrics(step()).latencySeconds).toBe(42.5);
  });

  it('reports nothing for a missing step or a step without usage', () => {
    expect(readAnalysisRunMetrics(undefined)).toEqual({});
    expect(readAnalysisRunMetrics(step({ output: {}, finishedAt: undefined }))).toEqual({
      connectorId: undefined,
      inputTokens: undefined,
      outputTokens: undefined,
      cachedTokens: undefined,
      latencySeconds: undefined,
    });
  });
});

describe('analysisRunMetricEvaluators', () => {
  it('scores the raw metric value', async () => {
    expect(await scoreOf('Output Tokens', { outputTokens: 300 })).toEqual({ score: 300 });
    expect(await scoreOf('Latency', { latencySeconds: 12.5 })).toEqual({ score: 12.5 });
  });

  it('reports an unrecorded metric as unavailable rather than as zero cost', async () => {
    expect(await scoreOf('Input Tokens', {})).toMatchObject({ score: null, label: 'unavailable' });
  });
});

describe('reportAnalysisRunMetrics', () => {
  const setup = () => {
    const runExperiment = jest.fn().mockResolvedValue([]);
    const log = { info: jest.fn() };
    return {
      runExperiment,
      log,
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
    };
  };

  it('runs the metric evaluators plus the judge on the structured output and logs the metrics', async () => {
    const { runExperiment, log, executorClient } = setup();
    const judge = { name: 'Criteria', kind: 'LLM', evaluate: jest.fn() } as unknown as Evaluator;
    const metrics = await reportAnalysisRunMetrics({
      executorClient,
      log,
      caseName: 'case',
      step: step({ executionTimeMs: 40_000 }),
      judge,
      judgeInput: { fixture: 'malicious' },
    });

    expect(metrics.inputTokens).toBe(1200);
    const [options, evaluators] = runExperiment.mock.calls[0];
    expect(evaluators).toEqual([...analysisRunMetricEvaluators, judge]);
    const [example] = options.datasets[0].examples;
    expect(example.input).toMatchObject({ caseName: 'case', fixture: 'malicious' });
    expect(example.metadata).toMatchObject({ inputTokens: 1200, latencySeconds: 40 });
    expect(await options.task()).toEqual({ verdict: 'confirmed_incident' });
    expect(log.info).toHaveBeenCalledWith(
      'AnalysisRunMetrics (case): connector=eis-haiku input=1200 output=300 cached=0 latency=40.0s'
    );
  });

  it('keys each invocation to one observation and omits the judge when none is given', async () => {
    const { runExperiment, log, executorClient } = setup();
    const args = { executorClient, log, caseName: 'case', step: step() };
    await reportAnalysisRunMetrics(args);
    await reportAnalysisRunMetrics(args);

    const [[first, firstEvaluators], [second]] = runExperiment.mock.calls;
    expect(firstEvaluators).toEqual(analysisRunMetricEvaluators);
    expect(first.name).not.toBe(second.name);
  });
});
