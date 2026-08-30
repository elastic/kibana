/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import {
  createGapAddressedEvaluator,
  createQuerySyntaxValidityEvaluator,
  RULE_EVALUATOR_DIRECTION,
  type RuleEvaluator,
} from './dataset_evaluator';

/**
 * Inverted-expectation evaluator for datasets/canary.ts: scores 1 when the quality gate
 * correctly penalizes a hopeless input (no rule produced, invalid/catch-all query, or
 * Gap Addressed 0) and 0 when everything sails through — meaning the gate stopped
 * discriminating.
 */
export const createCanaryEvaluator = (evaluators: DefaultEvaluators): RuleEvaluator => ({
  direction: RULE_EVALUATOR_DIRECTION,
  name: 'Canary Tripped',
  kind: 'LLM',
  evaluate: async (args) => {
    if (!args.output?.rule) {
      return { score: 1, metadata: { trippedBy: 'no rule produced' } };
    }
    const syntax = await createQuerySyntaxValidityEvaluator().evaluate(args);
    if (syntax.score === 0) {
      return {
        score: 1,
        metadata: { trippedBy: 'Query Syntax Validity', syntax: syntax.metadata },
      };
    }
    const gap = await createGapAddressedEvaluator(evaluators).evaluate(args);
    if (gap.score === 0) {
      return { score: 1, metadata: { trippedBy: 'Gap Addressed' } };
    }
    return {
      score: 0,
      metadata: {
        error: 'Quality gate did not trip on the canary input',
        syntaxScore: syntax.score,
        gapScore: gap.score,
      },
    };
  },
});
