/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { infraFailureResult, isNegativeControl, notApplicableResult } from './evaluator_helpers';
import type { DefendInsightsDatasetExample, DefendInsightsTaskOutput } from './types';

export const NEGATIVE_CONTROL_EVALUATOR_NAME = 'NegativeControl';

/**
 * Applies only to examples with no expected groups (a clean host). Passes when no seeded benign
 * executable appears in any insight event.
 */
export const createNegativeControlEvaluator = (): Evaluator<
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput
> => ({
  name: NEGATIVE_CONTROL_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (!isNegativeControl(expected)) {
      return notApplicableResult('not a negative-control example');
    }
    const infra = infraFailureResult(output);
    if (infra) return infra;
    if (output.status !== 'succeeded' || !output.insights) {
      return notApplicableResult(`generation ${output.status}; nothing to check`);
    }

    const benign = new Set(expected?.benignPaths ?? []);
    const flagged = output.insights.flatMap(({ events = [] }) =>
      events.map(({ value }) => value).filter((value) => benign.has(value))
    );
    const unique = [...new Set(flagged)];

    return {
      score: unique.length === 0 ? 1 : 0,
      label: unique.length === 0 ? 'pass' : 'fail',
      explanation:
        unique.length === 0 ? undefined : `benign executables flagged: ${unique.join(', ')}`,
    };
  },
});
