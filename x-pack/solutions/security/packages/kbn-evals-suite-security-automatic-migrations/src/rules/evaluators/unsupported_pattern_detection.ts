/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createUnsupportedPatternDetectionEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'Unsupported Pattern Detection',
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
    if (expected == null) {
      return { score: null, explanation: 'No expected output defined' };
    }

    if (!expected.is_unsupported) {
      return { score: null, explanation: 'Rule is not expected to be unsupported' };
    }

    const translationResult = output?.rule?.translation_result;
    const query = output?.rule?.elastic_rule?.query;

    const flaggedCorrectly = translationResult === 'untranslatable';
    const noHallucinatedQuery = !query || query.trim().length === 0;

    if (flaggedCorrectly && noHallucinatedQuery) {
      return {
        score: 1,
        label: 'PASS',
        explanation: 'Correctly flagged as untranslatable with no hallucinated query',
      };
    }

    const issues: string[] = [];
    if (!flaggedCorrectly) {
      issues.push(`Expected untranslatable but got "${translationResult ?? 'undefined'}"`);
    }
    if (!noHallucinatedQuery) {
      issues.push('Produced a query for an unsupported pattern (hallucination)');
    }

    return { score: 0, label: 'FAIL', explanation: issues.join('; ') };
  },
});
