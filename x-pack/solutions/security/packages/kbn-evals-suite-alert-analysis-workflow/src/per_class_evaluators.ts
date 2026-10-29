/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { CLASSIFICATIONS, type Classification } from './constants';
import type { AlertAnalysisVerdict } from './workflow_task';

const asVerdict = (output: unknown): AlertAnalysisVerdict => output as AlertAnalysisVerdict;
const expectedClass = (expected: unknown): Classification | undefined =>
  (expected as { classification?: Classification } | undefined)?.classification;

const NOT_APPLICABLE = {
  score: null,
  label: 'N/A',
  explanation: 'Example is not in the class this evaluator reports on.',
};

/** Per-class accuracy: N/A outside the class, so the run mean is that class's accuracy. */
const createPerClassAccuracy = (cls: Classification): Evaluator => ({
  name: `Accuracy:${cls}`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (expectedClass(expected) !== cls) {
      return NOT_APPLICABLE;
    }
    const predicted = asVerdict(output).classification;
    return {
      score: predicted === cls ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `expected="${cls}" predicted="${predicted ?? 'none'}"`,
    };
  },
});

export const perClassAccuracyEvaluators: Evaluator[] = CLASSIFICATIONS.map(createPerClassAccuracy);

/** Guardrail: a true positive classified false_positive would be closed as benign. */
export const maliciousNotClosed: Evaluator = {
  name: 'MaliciousNotClosed',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (expectedClass(expected) !== 'true_positive') {
      return NOT_APPLICABLE;
    }
    const predicted = asVerdict(output).classification;
    const closedAsBenign = predicted === 'false_positive';
    return {
      score: closedAsBenign ? 0 : 1,
      label: closedAsBenign ? 'closed_as_benign' : 'not_closed',
      explanation: `true positive predicted="${predicted ?? 'none'}"`,
    };
  },
};
