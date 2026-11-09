/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { infraFailureResult, isNegativeControl, notApplicableResult } from './evaluator_helpers';
import type { DefendInsightsDatasetExample, DefendInsightsTaskOutput } from './types';

export const INSIGHTS_WELL_FORMED_EVALUATOR_NAME = 'InsightsWellFormed';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Every insight has a non-empty `group` and at least one event with a non-empty `id` and `value`.
 * An empty result is well formed only for the negative control.
 */
export const createInsightsWellFormedEvaluator = (): Evaluator<
  DefendInsightsDatasetExample,
  DefendInsightsTaskOutput
> => ({
  name: INSIGHTS_WELL_FORMED_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const infra = infraFailureResult(output, expected);
    if (infra) return infra;
    if (output.status !== 'succeeded' || !output.insights) {
      return notApplicableResult(`generation ${output.status}; no insights to validate`);
    }

    if (output.insights.length === 0) {
      const ok = isNegativeControl(expected);
      return {
        score: ok ? 1 : 0,
        label: ok ? 'pass' : 'fail',
        explanation: ok ? undefined : 'no insights returned',
      };
    }

    const problems = output.insights.flatMap((insight, index) => {
      const found: string[] = [];
      if (!isNonEmptyString(insight.group)) found.push(`insight[${index}] has an empty group`);
      const events = insight.events ?? [];
      if (events.length === 0) found.push(`insight[${index}] has no events`);
      events.forEach((event, eventIndex) => {
        if (!isNonEmptyString(event.id) || !isNonEmptyString(event.value)) {
          found.push(`insight[${index}].events[${eventIndex}] is missing id or value`);
        }
      });
      return found;
    });

    return {
      score: problems.length === 0 ? 1 : 0,
      label: problems.length === 0 ? 'pass' : 'fail',
      explanation: problems.length === 0 ? undefined : problems.join('; '),
    };
  },
});
