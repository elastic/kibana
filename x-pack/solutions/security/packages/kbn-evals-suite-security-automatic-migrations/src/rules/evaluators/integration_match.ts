/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createIntegrationMatchEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'Integration Match',
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
    if (expected?.integration_id == null) {
      return { score: null, explanation: 'No expected integration defined' };
    }

    const actualIds = output?.rule?.elastic_rule?.integration_ids ?? [];
    const matched = actualIds.includes(expected.integration_id);

    return {
      score: matched ? 1 : 0,
      label: matched ? 'PASS' : 'FAIL',
      explanation: matched
        ? `Correctly matched integration: ${expected.integration_id}`
        : `Expected integration "${expected.integration_id}" but got [${actualIds.join(', ')}]`,
    };
  },
});
