/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { DashboardExample, DashboardExpected } from '../../../datasets/dashboards/types';
import type { MigrationResult } from '../migration_client';
import { countTranslatedPanels } from '../helpers';

export const createPanelCountPreservationEvaluator = (): Evaluator<
  DashboardExample,
  MigrationResult
> => ({
  name: 'Panel Count Preservation',
  kind: 'CODE',
  evaluate: async ({
    output,
    expected,
  }: {
    input: unknown;
    output: MigrationResult;
    expected: DashboardExpected | undefined;
    metadata: unknown;
  }): Promise<EvaluationResult> => {
    if (expected?.panel_count == null) {
      return { score: null, explanation: 'No expected panel_count in dataset' };
    }

    const actualCount = countTranslatedPanels(output);
    const expectedCount = expected.panel_count;
    const matches = actualCount === expectedCount;

    return {
      score: matches ? 1 : 0,
      explanation: matches
        ? `Panel count matches: ${actualCount}`
        : `Panel count mismatch: expected ${expectedCount}, got ${actualCount}`,
      metadata: {
        expectedCount,
        actualCount,
      },
    };
  },
});
