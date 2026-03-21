/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const TOKEN_USAGE_EVALUATOR_NAME = 'TokenUsage';

export interface TokenUsageMetadata {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export const createTokenUsageEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => {
  return {
    name: TOKEN_USAGE_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const tokens = output?.metadata?.tokens as TokenUsageMetadata | undefined;

      if (!tokens || typeof tokens.totalTokens !== 'number') {
        return {
          score: 0,
          label: 'missing_tokens',
          metadata: { error: 'No token usage data captured' },
        };
      }

      // Score based on efficiency (lower is better)
      // <50K tokens = 1.0, 50-100K = 0.7, >100K = 0.3
      const totalK = tokens.totalTokens / 1000;
      let score = 1.0;

      if (totalK > 50 && totalK <= 100) {
        score = 0.7;
      } else if (totalK > 100) {
        score = 0.3;
      }

      return {
        score,
        label: 'measured',
        metadata: {
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          totalTokens: tokens.totalTokens,
          totalK,
        },
      };
    },
  };
};
