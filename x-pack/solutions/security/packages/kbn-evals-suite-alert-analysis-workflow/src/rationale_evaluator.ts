/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { AlertAnalysisVerdict } from './workflow_task';

const asVerdict = (output: unknown): AlertAnalysisVerdict => output as AlertAnalysisVerdict;

/**
 * Wraps the criteria judge for the rationale: a verdict with no rationale is a
 * measurement gap, not a quality zero. The judge never sees the empty artifact,
 * so it cannot grade "absence" as a grounding failure.
 */
export const createRationaleQualityEvaluator = (
  evaluators: DefaultEvaluators,
  criteria: readonly string[]
): Evaluator => {
  const inner = evaluators.criteria([...criteria]);

  return {
    ...inner,
    name: 'RationaleQuality',
    evaluate: async (args) => {
      const rationale = asVerdict(args.output)?.rationale;
      if (rationale == null || rationale.trim().length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No rationale in verdict — skipping rationale quality evaluation.',
          metadata: { missingRationale: true },
        };
      }
      return inner.evaluate(args);
    },
  };
};
