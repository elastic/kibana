/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { Evaluator, EvalsExecutorClient } from '@kbn/evals';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

interface Logger {
  info: (message: string) => void;
}

export interface AnalysisRunMetrics {
  connectorId?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  latencySeconds?: number;
}

type NumericMetric = Exclude<keyof AnalysisRunMetrics, 'connectorId'>;

interface AgentStepOutput {
  structured_output?: unknown;
  metadata?: {
    usage?: {
      connectorId?: unknown;
      inputTokens?: unknown;
      outputTokens?: unknown;
      cachedTokens?: unknown;
    };
  };
}

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const stepLatencySeconds = (step: WorkflowStepExecutionDto): number | undefined => {
  const executionTimeMs = finiteNumber(step.executionTimeMs);
  if (executionTimeMs !== undefined) return executionTimeMs / 1000;
  if (!step.finishedAt) return undefined;
  const elapsedMs = Date.parse(step.finishedAt) - Date.parse(step.startedAt);
  return Number.isFinite(elapsedMs) ? elapsedMs / 1000 : undefined;
};

/**
 * Reads token usage and latency from the analysis `ai.agent` step execution. The workflow
 * engine records both on the step itself, so this needs no trace backend.
 */
export const readAnalysisRunMetrics = (
  step: WorkflowStepExecutionDto | undefined
): AnalysisRunMetrics => {
  if (!step) return {};
  const usage = (step.output as AgentStepOutput | undefined)?.metadata?.usage;
  return {
    connectorId: typeof usage?.connectorId === 'string' ? usage.connectorId : undefined,
    inputTokens: finiteNumber(usage?.inputTokens),
    outputTokens: finiteNumber(usage?.outputTokens),
    cachedTokens: finiteNumber(usage?.cachedTokens),
    latencySeconds: stepLatencySeconds(step),
  };
};

const metricEvaluator = (name: string, key: NumericMetric): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ metadata }) => {
    const value = (metadata as AnalysisRunMetrics | null | undefined)?.[key];
    return value === undefined
      ? { score: null, label: 'unavailable', explanation: `${key} was not recorded` }
      : { score: value };
  },
});

export const analysisRunMetricEvaluators: Evaluator[] = [
  metricEvaluator('Input Tokens', 'inputTokens'),
  metricEvaluator('Output Tokens', 'outputTokens'),
  metricEvaluator('Cached Tokens', 'cachedTokens'),
  metricEvaluator('Latency', 'latencySeconds'),
];

const formatMetric = (value: number | undefined, digits = 0) =>
  value === undefined ? 'n/a' : value.toFixed(digits);

/**
 * Scores token usage, latency and, optionally, an LLM judge for one observed analysis run, so
 * a model comparison reads cost and quality from the same experiment. Like
 * `reportActionSafety`, each invocation is keyed to one observation so executor repetitions
 * never pool duplicate scores of a single run as independent samples. Never throws on missing
 * usage; `assertAnalysisExecution` owns that check.
 */
export const reportAnalysisRunMetrics = async ({
  executorClient,
  log,
  caseName,
  step,
  judge,
  judgeInput,
}: {
  executorClient: EvalsExecutorClient;
  log: Logger;
  caseName: string;
  step: WorkflowStepExecutionDto | undefined;
  judge?: Evaluator;
  /** Fixture facts the judge scores the analysis output against. */
  judgeInput?: Record<string, unknown>;
}): Promise<AnalysisRunMetrics> => {
  const metrics = readAnalysisRunMetrics(step);
  log.info(
    `AnalysisRunMetrics (${caseName}): connector=${
      metrics.connectorId ?? 'n/a'
    } input=${formatMetric(metrics.inputTokens)} output=${formatMetric(
      metrics.outputTokens
    )} cached=${formatMetric(metrics.cachedTokens)} latency=${formatMetric(
      metrics.latencySeconds,
      1
    )}s`
  );
  const structuredOutput = (step?.output as AgentStepOutput | undefined)?.structured_output;
  const observationId = randomUUID();
  await executorClient.runExperiment(
    {
      name: `alertzero-endpoint-analysis-run-metrics: ${caseName} (${observationId})`,
      datasets: [
        {
          name: `alertzero-endpoint-analysis-run-metrics: ${caseName}`,
          description: `Token usage, latency and judged quality of the Endpoint Analysis agent step (${caseName}).`,
          examples: [
            {
              input: { caseName, observationId, ...judgeInput },
              output: null,
              metadata: { ...metrics },
            },
          ],
        },
      ],
      task: async () => structuredOutput ?? null,
    },
    judge ? [...analysisRunMetricEvaluators, judge] : analysisRunMetricEvaluators
  );
  return metrics;
};
