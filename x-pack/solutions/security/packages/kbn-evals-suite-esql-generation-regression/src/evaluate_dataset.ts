/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvalsExecutorClient } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator, withEvaluatorSpan } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlGenerationDataset } from './dataset';

const ESQL_GENERATION_SYSTEM_PROMPT = `You are an Elastic ES|QL query generation expert.
Given a natural language question about data stored in Elasticsearch, generate the corresponding ES|QL query.
Return ONLY the raw ES|QL query text with no markdown code fences, no explanation, and no surrounding text.
If the request cannot be fulfilled with ES|QL (for example, pagination is not natively supported in ES|QL), briefly explain why instead of generating a query.`;

export type EvaluateEsqlGenerationDataset = () => Promise<void>;

export function createEvaluateEsqlGenerationDataset({
  executorClient,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateEsqlGenerationDataset {
  const baseEvaluator = createEsqlEquivalenceEvaluator({
    inferenceClient,
    log,
    predictionExtractor: (output) => (output as { esql: string }).esql ?? '',
    groundTruthExtractor: (expected) => (expected as { query: string }).query ?? '',
  });

  const esqlEquivalenceEvaluator: Evaluator = {
    ...baseEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlFunctionalEquivalence', {}, () => baseEvaluator.evaluate(args)),
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
      [esqlEquivalenceEvaluator]
    );
  };
}
