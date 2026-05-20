/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample, RuleExpected } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';
import { esqlHasLookupJoin } from '../helpers';

export const createLookupJoinPreservationEvaluator = (): Evaluator<
  RuleExample,
  RuleMigrationResult
> => ({
  name: 'LOOKUP JOIN Preservation',
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

    if (output?.rule?.translation_result === 'untranslatable') {
      return { score: null, explanation: 'Rule is untranslatable — skipping LOOKUP JOIN check' };
    }

    const query = output?.rule?.elastic_rule?.query;

    if (!query) {
      return {
        score: expected.has_lookup_join ? 0 : 1,
        explanation: expected.has_lookup_join
          ? 'Expected LOOKUP JOIN but no query was produced'
          : 'No query produced and no LOOKUP JOIN expected',
      };
    }

    const hasJoin = esqlHasLookupJoin(query);

    if (expected.has_lookup_join && hasJoin) {
      return { score: 1, label: 'PASS', explanation: 'LOOKUP JOIN correctly present' };
    }
    if (!expected.has_lookup_join && !hasJoin) {
      return { score: 1, label: 'PASS', explanation: 'No LOOKUP JOIN as expected' };
    }
    if (expected.has_lookup_join && !hasJoin) {
      return { score: 0, label: 'FAIL', explanation: 'Expected LOOKUP JOIN but not found in ESQL' };
    }
    return { score: 0, label: 'FAIL', explanation: 'Unexpected LOOKUP JOIN found in ESQL' };
  },
});
