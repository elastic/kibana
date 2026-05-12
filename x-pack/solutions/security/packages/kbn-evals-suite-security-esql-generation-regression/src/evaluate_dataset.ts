/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { DefaultEvaluators, Evaluator, EvalsExecutorClient } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator, withEvaluatorSpan } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EsqlRegressionAgentBuilderChatClient } from './chat_client';
import { esqlGenerationDataset } from './dataset';
import { createEsqlValidityEvaluator } from './evaluators/esql_validity';
import { createEsqlExecutionEvaluator } from './evaluators/esql_execution';
import { createEsqlResultEquivalenceEvaluator } from './evaluators/esql_result_equivalence';
import { extractEsqlFromConverseResponse } from './extract_esql';

/**
 * Task output shape. Mirrors the alerts-rag suite so the framework's
 * trace-based evaluators (`toolCalls`, `latency`, `inputTokens`, …) can
 * resolve the OTel trace by `traceId`. `esql` is the extracted prediction
 * the quality evaluators read.
 */
interface EsqlTaskOutput {
  esql: string;
  traceId?: string;
  messages: Array<{ message: string }>;
  steps: Array<{
    type?: string;
    tool_id?: string;
    results?: unknown[];
    [k: string]: unknown;
  }>;
}

const predictionExtractor = (output: unknown): string =>
  (output as EsqlTaskOutput | undefined)?.esql ?? '';

const groundTruthExtractor = (expected: unknown): string =>
  (expected as { query: string } | undefined)?.query ?? '';

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
  chatClient,
  evaluators,
  executorClient,
  inferenceClient,
  esClient,
  traceEsClient,
  log,
}: {
  chatClient: EsqlRegressionAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  esClient: EsClient;
  // `traceEsClient` is wired through for symmetry with the alerts-rag suite
  // and so trace-based evaluators sourced from `evaluators.traceBasedEvaluators`
  // can resolve OTel traces. It is intentionally unused here directly.
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateEsqlGenerationDataset {
  void traceEsClient;

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
          // Drive the full Agent Builder default agent (`elastic-ai-agent`)
          // via `/api/agent_builder/converse`, mirroring the alerts-rag
          // suite. This is the supported successor to the LangSmith-era
          // `DefaultAssistantGraph.invoke()` path: the agent runs its own
          // tool loop (list_indices, get_index_mapping, generate_esql)
          // before surfacing a result, so the suite measures the same
          // production code path users hit from the assistant UI.
          const response = await chatClient.converse({ message: question });
          const esql = extractEsqlFromConverseResponse(response);

          const output: EsqlTaskOutput = {
            esql,
            traceId: response.traceId,
            messages: response.messages,
            steps: response.steps,
          };
          return output;
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
