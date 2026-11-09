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

const taskError = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'task_error',
  explanation,
});

/**
 * Infra failures never reached a verdict, so they are `task_error` (null score) rather than a model
 * miss. `failed` and `canceled` are reported by the route itself and are scored by
 * `GenerationSucceeded`. Three cases:
 * - `timed_out` / `request_failed`: the request or poll failed.
 * - `succeeded` without `eventsContextCount`: the persisted insight does not say what the model saw.
 * - `succeeded` with fewer events than were seeded (including 0): the route marks such a run
 *   `succeeded` with empty insights, which would otherwise pass the negative control without testing
 *   it (lookup failure, seeding missed by the retriever, transform lag).
 */
export const infraFailureResult = (
  { status, error, eventsContextCount }: DefendInsightsTaskOutput,
  expected?: DefendInsightsExpectedOutput
): EvaluationResult | undefined => {
  if (status === 'timed_out' || status === 'request_failed') {
    return taskError(error ?? status);
  }
  if (status !== 'succeeded' || !expected) return undefined;

  if (eventsContextCount === undefined) {
    return taskError('succeeded insight did not report eventsContextCount');
  }
  if (eventsContextCount === 0 || eventsContextCount < expected.seededEventCount) {
    return taskError(
      `model saw ${eventsContextCount} events but ${expected.seededEventCount} unique executables were seeded`
    );
  }
  return undefined;
};

export const notApplicableResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'N/A',
  explanation,
});
