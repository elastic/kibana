/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { RuleExample } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createEsqlValidityEvaluator = (): Evaluator<RuleExample, RuleMigrationResult> => ({
  name: 'Translated ESQL Validity',
  kind: 'CODE',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const query = output?.rule?.elastic_rule?.query;

    if (!query) {
      return { score: 0, label: 'FAIL', explanation: 'No ESQL query produced' };
    }

    const issues: string[] = [];

    if (/\[(macro|lookup):.*?\]/i.test(query)) {
      issues.push('Contains unresolved macro/lookup placeholder');
    }

    if (/\[indexPattern\]/i.test(query)) {
      issues.push('Contains unresolved [indexPattern] placeholder');
    }

    const fromMatch = query.match(/FROM\s+(\S+)/i);
    if (!fromMatch || fromMatch[1] === '[indexPattern]') {
      issues.push('No valid index pattern in FROM clause');
    }

    const score = issues.length === 0 ? 1 : 0;
    const explanation =
      issues.length === 0
        ? 'ESQL query is valid with populated index pattern'
        : `Invalid: ${issues.join('; ')}`;

    return { score, label: score === 1 ? 'PASS' : 'FAIL', explanation };
  },
});
