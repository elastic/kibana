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
 * Applies only to examples with no expected groups (a clean host). Passes only when the model
 * returns no insight at all: every seeded executable is benign, so any insight is a false positive.
 * The explanation lists the paths it flagged.
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
    const infra = infraFailureResult(output, expected);
    if (infra) return infra;
    if (output.status !== 'succeeded' || !output.insights) {
      return notApplicableResult(`generation ${output.status}; nothing to check`);
    }

    if (output.insights.length === 0) {
      return { score: 1, label: 'pass' };
    }

    const flagged = [
      ...new Set(output.insights.flatMap(({ events = [] }) => events.map(({ value }) => value))),
    ];
    const groups = output.insights.map(({ group }) => group).join(', ');
    return {
      score: 0,
      label: 'fail',
      explanation: `clean host returned ${
        output.insights.length
      } insight(s) (groups: ${groups}); flagged paths: ${
        flagged.length > 0 ? flagged.join(', ') : 'none listed'
      }`,
    };
  },
});
