/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { infraFailureResult } from './evaluator_helpers';
import type { DefendInsightsDatasetExample, DefendInsightsTaskOutput } from './types';

export const GENERATION_SUCCEEDED_EVALUATOR_NAME = 'GenerationSucceeded';

/** The route reached the terminal `succeeded` status (no graph failure, no cancellation). */
export const createGenerationSucceededEvaluator = (): Evaluator<
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput
> => ({
  name: GENERATION_SUCCEEDED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const infra = infraFailureResult(output, expected);
    if (infra) return infra;

    const succeeded = output.status === 'succeeded';
    return {
      score: succeeded ? 1 : 0,
      label: succeeded ? 'pass' : 'fail',
      explanation: succeeded ? undefined : output.error ?? `status ${output.status}`,
    };
  },
});
