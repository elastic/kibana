/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';
import { levenshteinSimilarity } from '../helpers';

export const createCustomQueryAccuracyEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'Custom Query Accuracy',
  kind: 'CODE',
  evaluate: async ({
    output,
    expected,
  }: {
    input: unknown;
    output: RuleMigrationResult;
    expected: RuleExpected | undefined;
    metadata: unknown;
  }): Promise<EvaluationResult> => {
    if (!expected?.esql_query) {
      return { score: null, explanation: 'No expected ESQL query defined (ground truth needed)' };
    }

    const actualQuery = output?.rule?.elastic_rule?.query;
    if (!actualQuery) {
      return {
        score: 0,
        label: 'FAIL',
        explanation: 'No ESQL query produced to compare against ground truth',
      };
    }

    const normalize = (q: string) => q.replace(/\s+/g, ' ').trim();
    const score = levenshteinSimilarity(normalize(actualQuery), normalize(expected.esql_query));

    return {
      score,
      label: score >= 0.8 ? 'PASS' : 'FAIL',
      explanation: `Query similarity: ${score} (1.0 = identical)`,
      metadata: {
        expectedQuery: expected.esql_query.slice(0, 200),
        actualQuery: actualQuery.slice(0, 200),
      },
    };
  },
});
