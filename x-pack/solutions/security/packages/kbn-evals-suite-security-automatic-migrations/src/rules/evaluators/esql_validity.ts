/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createEsqlValidityEvaluator as createFrameworkEsqlValidityEvaluator } from '@kbn/evals';
import type { RuleExample } from '../../../datasets/rules/types';
import type { RuleMigrationResult } from '../migration_client';

export const createEsqlValidityEvaluator = (): Evaluator<RuleExample, RuleMigrationResult> =>
  createFrameworkEsqlValidityEvaluator<RuleExample, RuleMigrationResult>({
    name: 'Translated ESQL Validity',
    queryExtractor: (output) => {
      const query = output?.rule?.elastic_rule?.query;
      return query ? [query] : [];
    },
    scoreOnEmptyQueries: 0,
  });
