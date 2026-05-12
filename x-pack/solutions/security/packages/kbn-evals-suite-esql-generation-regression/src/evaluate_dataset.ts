/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Evaluator, EvalsExecutorClient } from '@kbn/evals';
import {
  createEsqlEquivalenceEvaluator,
  createEsqlExecutionEvaluator,
  createEsqlResultEquivalenceEvaluator,
  createEsqlValidityEvaluator,
  withEvaluatorSpan,
} from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlGenerationDataset } from './dataset';

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

export type EvaluateEsqlGenerationDataset = () => Promise<void>;

export function createEvaluateEsqlGenerationDataset({
  executorClient,
  inferenceClient,
  esClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  esClient: EsClient;
  log: ToolingLog;
}): EvaluateEsqlGenerationDataset {
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
    await executorClient.runExperiment(
      {
        dataset: {
          name: 'esql-generation: regression suite',
          description:
            '31 examples from LangSmith "ES|QL Generation Regression Suite" (id: 261dcc59-fbe7-4397-a662-ff94042f666c)',
          examples: esqlGenerationDataset,
        },
        task: async ({ input }) => {
          const question = input?.question ?? '';
          const response = await inferenceClient.chatComplete({
            system: ESQL_GENERATION_SYSTEM_PROMPT,
            messages: [{ role: MessageRole.User, content: question }],
          });
          return { esql: response.content };
        },
      },
      [
        esqlEquivalenceEvaluator,
        esqlValidityEvaluator,
        esqlExecutionEvaluator,
        esqlResultEquivalenceEvaluator,
      ]
    );
  };
}
