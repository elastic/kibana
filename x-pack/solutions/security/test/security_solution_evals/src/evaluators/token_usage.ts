/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import type { ModelUsageStats } from '../chat_client';

/**
 * Evaluator that reports token-usage statistics and estimated cost per evaluation example.
 * Returns totalTokens as the score so it shows actual numbers in the report.
 */
export const createTokenUsageEvaluator = (): Evaluator => ({
  name: 'TokenUsage',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const taskOutput = output as TaskOutput & {
      modelUsage?: ModelUsageStats;
    };
    const modelUsage = taskOutput.modelUsage;

    const inputTokens = modelUsage?.input_tokens ?? 0;
    const outputTokens = modelUsage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    const llmCalls = modelUsage?.llm_calls ?? 0;

    // Calculate cost estimate (default pricing: $0.003/1K input, $0.015/1K output)
    const inputPricePer1K = 0.003;
    const outputPricePer1K = 0.015;
    const estimatedCost =
      (inputTokens / 1000) * inputPricePer1K + (outputTokens / 1000) * outputPricePer1K;

    return {
      score: totalTokens,
      metadata: {
        source: 'direct',
        inputTokens,
        outputTokens,
        totalTokens,
        llmCalls,
        model: modelUsage?.model,
        connectorId: modelUsage?.connector_id,
        estimatedCostUsd: Math.round(estimatedCost * 10000) / 10000,
      },
    };
  },
});
