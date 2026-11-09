/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from '@kbn/evals';
import type {
  DefendInsightsDatasetExample,
  DefendInsightsExpectedOutput,
  DefendInsightsTaskOutput,
} from './types';

export interface DefendInsightsEvaluatorParams {
  output: DefendInsightsTaskOutput;
  expected?: DefendInsightsDatasetExample['output'];
}

/** A negative control expects no insight groups at all. */
export const isNegativeControl = (expected?: DefendInsightsExpectedOutput): boolean =>
  expected !== undefined && expected.results.length === 0;

/**
 * Infra failures (request error, poll timeout) never reached a verdict, so they are
 * `task_error` (null score) rather than a model miss. `failed` and `canceled` are
 * reported by the route itself and are scored by `GenerationSucceeded`.
 */
export const infraFailureResult = ({
  status,
  error,
}: DefendInsightsTaskOutput): EvaluationResult | undefined =>
  status === 'timed_out' || status === 'request_failed'
    ? { score: null, label: 'task_error', explanation: error ?? status }
    : undefined;

export const notApplicableResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'N/A',
  explanation,
});
