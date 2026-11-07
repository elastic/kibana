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
 * Wraps the criteria judge for the rationale. The evaluator keeps the inner
 * `criteria` name (no override) so pre-PR .evaluation-scores baselines and
 * compare runs stay keyed on the same evaluator name.
 */
export const createRationaleQualityEvaluator = (
  evaluators: DefaultEvaluators,
  criteria: readonly string[]
): Evaluator => {
  const inner = evaluators.criteria([...criteria]);

  return {
    ...inner,
    evaluate: async (args) => {
      const verdict = asVerdict(args.output);
      const rationale = verdict?.rationale;
      const hasRationale = rationale != null && rationale.trim().length > 0;
      const hasClassification = verdict?.classification != null;
      // N/A only for the evidenced empty-artifact shape: a verdict with
      // neither classification nor rationale (the judge never sees it, so
      // absence cannot be graded as a grounding failure).
      if (!hasClassification && !hasRationale) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No verdict — workflow produced neither classification nor rationale.',
          metadata: { missingVerdict: true },
        };
      }
      // A classification without a rationale is a schema violation (rationale
      // is required by alert_analysis_workflow.yaml), not a measurement gap:
      // score 0 so it surfaces in ValidVerdict and the means instead of
      // silently vanishing as N/A.
      if (!hasRationale) {
        return {
          score: 0,
          label: 'missing-rationale',
          explanation:
            'Verdict has a classification but no rationale — schema-required field missing.',
          metadata: { missingRationale: true },
        };
      }
      // The example input is only `{ alertId }`, so without the alert the grounding criterion
      // ("does not invent alert fields...") counts every grounded detail as invented. Hand the
      // judge the analysed alert as part of the input.
      const { alertData, ...gradedOutput } = verdict;
      return inner.evaluate({
        ...args,
        input: { ...(args.input as Record<string, unknown>), alertData },
        output: gradedOutput,
      });
    },
  };
};
