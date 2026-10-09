/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const createAttackDiscoveryCriteriaEvaluator = ({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => {
  return {
    name: 'Criteria',
    kind: 'LLM',
    evaluate: async ({ expected, output, input, metadata }) => {
      const criteria = expected?.criteria ?? [];
      if (criteria.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No criteria annotation — skipping criteria evaluation.',
        };
      }

      const serializedOutput = JSON.stringify(
        {
          insights: output?.insights ?? null,
          errors: output?.errors ?? [],
        },
        null,
        2
      );

      return evaluators.criteria(criteria).evaluate({
        input,
        expected: { expected: serializedOutput },
        output: {
          messages: [{ message: serializedOutput }],
          steps: [],
          errors: output?.errors ?? [],
        },
        metadata,
      });
    },
  };
};
