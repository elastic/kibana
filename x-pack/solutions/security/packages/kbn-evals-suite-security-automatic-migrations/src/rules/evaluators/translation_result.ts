/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createTranslationResultEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'Translation Result',
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
    if (!expected?.translation_result) {
      return { score: null, explanation: 'No expected translation result defined' };
    }

    const actual = output?.rule?.translation_result;
    const matched = actual === expected.translation_result;

    return {
      score: matched ? 1 : 0,
      label: matched ? 'PASS' : 'FAIL',
      explanation: matched
        ? `Correctly produced "${expected.translation_result}" translation`
        : `Expected "${expected.translation_result}" but got "${actual ?? 'undefined'}"`,
    };
  },
});
