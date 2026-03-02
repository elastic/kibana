/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';

export { createToolUsageOnlyEvaluator } from '@kbn/evals';

interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
}

type TaskOutputWithModelUsage = TaskOutput & {
  modelUsage?: ModelUsage;
};

export const createTokenUsageEvaluator = (): Evaluator => ({
  name: 'TokenUsage',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const taskOutput = output as TaskOutputWithModelUsage;
    const usage = taskOutput.modelUsage;

    if (!usage) {
      return { score: 0, metadata: { reason: 'No model usage data found' } };
    }

    const totalTokens = usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);

    return {
      score: totalTokens,
      metadata: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cachedTokens: usage.cachedTokens ?? 0,
        totalTokens,
      },
    };
  },
});
