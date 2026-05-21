/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createPrebuiltRuleMatchEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'Prebuilt Rule Match',
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

    const actualId = output?.rule?.elastic_rule?.prebuilt_rule_id ?? null;
    const expectedId = expected.prebuilt_rule_id;

    if (expectedId == null && actualId == null) {
      return { score: 1, label: 'PASS', explanation: 'Correctly did not match a prebuilt rule' };
    }

    if (expectedId != null && actualId === expectedId) {
      return {
        score: 1,
        label: 'PASS',
        explanation: `Correctly matched prebuilt rule: ${expectedId}`,
      };
    }

    return {
      score: 0,
      label: 'FAIL',
      explanation: `Expected prebuilt rule "${expectedId ?? 'none'}" but got "${
        actualId ?? 'none'
      }"`,
    };
  },
});
