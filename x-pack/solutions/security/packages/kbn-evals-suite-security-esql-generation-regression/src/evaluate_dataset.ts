/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator, EvalsExecutorClient } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator, getCurrentTraceId, withEvaluatorSpan } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlGenerationDataset } from './dataset';
import { createEsqlValidityEvaluator } from './evaluators/esql_validity';
import { createEsqlExecutionEvaluator } from './evaluators/esql_execution';
import { createEsqlResultEquivalenceEvaluator } from './evaluators/esql_result_equivalence';

const ESQL_GENERATION_SYSTEM_PROMPT = `You are an Elastic ES|QL query generation expert.
Given a natural language question about data stored in Elasticsearch, generate the corresponding ES|QL query.
Return ONLY the raw ES|QL query text with no markdown code fences, no explanation, and no surrounding text.
If the request cannot be fulfilled with ES|QL (for example, pagination is not natively supported in ES|QL), briefly explain why instead of generating a query.`;

const predictionExtractor = (output: unknown): string => (output as { esql: string }).esql ?? '';

const groundTruthExtractor = (expected: unknown): string =>
  (expected as { query: string }).query ?? '';

const queryExtractor = (output: unknown): string[] => {
  const query = predictionExtractor(output);
  return query ? [query] : [];
};

/**
 * Honors `ESQL_GENERATION_DATASET_OFFSET` (skip first N) and
 * `ESQL_GENERATION_DATASET_LIMIT` (cap result size) to slice the dataset for
 * fast smoke iteration. Invalid values fall through to the full dataset.
 */
function sliceDataset<T>(examples: readonly T[]): T[] {
  const parsePositiveInt = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const offset = parsePositiveInt(process.env.ESQL_GENERATION_DATASET_OFFSET) ?? 0;
  const limit = parsePositiveInt(process.env.ESQL_GENERATION_DATASET_LIMIT);
  const end = limit !== undefined ? offset + limit : examples.length;
  return examples.slice(offset, end);
}

export type EvaluateEsqlGenerationDataset = () => Promise<void>;

export function createEvaluateEsqlGenerationDataset({
  evaluators,
  executorClient,
  inferenceClient,
  esClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  esClient: EsClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateEsqlGenerationDataset {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;
  const baseEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
    inferenceClient,
    log,
    predictionExtractor,
    groundTruthExtractor,
  });

  const esqlEquivalenceEvaluator: Evaluator = {
    ...baseEquivalenceEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlFunctionalEquivalence', {}, () =>
        baseEquivalenceEvaluator.evaluate(args)
      ),
  };

  const baseValidityEvaluator = createEsqlValidityEvaluator({ queryExtractor });

  const esqlValidityEvaluator: Evaluator = {
    ...baseValidityEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlValidity', {}, () => baseValidityEvaluator.evaluate(args)),
  };

  const baseExecutionEvaluator = createEsqlExecutionEvaluator({
    esClient,
    queryExtractor,
  });

  const esqlExecutionEvaluator: Evaluator = {
    ...baseExecutionEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlExecution', {}, () => baseExecutionEvaluator.evaluate(args)),
  };

  const baseResultEquivalenceEvaluator = createEsqlResultEquivalenceEvaluator({
    esClient,
    predictionExtractor,
    groundTruthExtractor,
  });

  const esqlResultEquivalenceEvaluator: Evaluator = {
    ...baseResultEquivalenceEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlResultEquivalence', {}, () =>
        baseResultEquivalenceEvaluator.evaluate(args)
      ),
  };

  return async function evaluateEsqlGenerationDataset(): Promise<void> {
    const examples = sliceDataset(esqlGenerationDataset);
    await executorClient.runExperiment(
      {
        dataset: {
          name: 'security-esql-generation: regression suite',
          description: `Security ES|QL generation: ${examples.length} examples (natural-language question → ground-truth query)`,
          examples,
        },
        task: async ({ input }) => {
          const question = input?.question ?? '';
          const response = await inferenceClient.chatComplete({
            system: ESQL_GENERATION_SYSTEM_PROMPT,
            messages: [{ role: MessageRole.User, content: question }],
          });
          // Capture the active task span's traceId so trace-based evaluators
          // (latency, token usage, tool calls) can query the OTel traces
          // captured by the EDOT collector. Mirrors the alerts-rag suite.
          return { esql: response.content, traceId: getCurrentTraceId() };
        },
      },
      [
        // Quality (LLM- and code-judged): functional correctness of generated ES|QL.
        esqlEquivalenceEvaluator,
        esqlValidityEvaluator,
        esqlExecutionEvaluator,
        esqlResultEquivalenceEvaluator,
        // Observability (trace-based, zero per-example LLM cost): baseline
        // signals derived from OTel spans for this task's trace.id. Used to
        // track regressions in latency / token usage / tool-call counts over
        // time without paying for additional LLM judging.
        toolCalls,
        latency,
        inputTokens,
        outputTokens,
        cachedTokens,
      ]
    );
  };
}
