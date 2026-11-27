/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult, EvaluationResult } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Lowest mean of Verdict and of Rule Match on one dataset. A check that returned no answer scores
 * 0 and counts. The number is not ratified yet, see CAPABILITY_PROFILE.md.
 */
export const MIN_MEAN_SCORE = 0.8;

const MEAN_GATED_EVALUATORS = ['Verdict', 'Rule Match'];

interface ScoredRun {
  evaluator: string;
  gapId: string;
  result: EvaluationResult;
}

const scoredRuns = ({ runs, evaluationRuns }: DatasetRunResult): ScoredRun[] =>
  evaluationRuns.flatMap(({ name, kind, result, experimentRunId, exampleId }) =>
    kind === 'CODE' && result
      ? [
          {
            evaluator: name,
            gapId: String(runs[experimentRunId]?.input?.gapId ?? exampleId ?? experimentRunId),
            result,
          },
        ]
      : []
  );

/**
 * A proposal made from this answer would act on the wrong rule, or could not install its rule.
 * One such answer fails the test, whatever the means are.
 */
const wrongRuleProblem = ({ evaluator, gapId, result }: ScoredRun): string | undefined => {
  const { score, label, explanation, metadata } = result;
  if (evaluator === 'Rule Match' && metadata?.nameMatchesId === false) {
    return `${gapId}: the rule_id and the rule_name of the answer are two different rules. ${explanation}`;
  }
  if (evaluator === 'Rule Match' && label === 'unknown_id') {
    return `${gapId}: ${explanation}`;
  }
  if (evaluator === 'Installable' && score === 0) {
    return `${gapId}: the proposal cannot install its rule (${label}). ${explanation}`;
  }
  return undefined;
};

const lowMeanProblems = (datasetName: string, runs: ScoredRun[]): string[] =>
  MEAN_GATED_EVALUATORS.flatMap((evaluator) => {
    const scores = runs.flatMap(({ evaluator: name, result: { score } }) =>
      name === evaluator && typeof score === 'number' ? [score] : []
    );
    if (scores.length === 0) {
      return [];
    }
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return mean < MIN_MEAN_SCORE
      ? [
          `${datasetName}: ${evaluator} mean is ${mean.toFixed(2)} (n=${
            scores.length
          }), the minimum is ${MIN_MEAN_SCORE}`,
        ]
      : [];
  });

/** The problems that fail the test. LLM judge scores are reported only, and never fail it. */
export const findScoreGateProblems = (results: DatasetRunResult[]): string[] =>
  results.flatMap((result) => {
    const runs = scoredRuns(result);
    return [
      ...runs.flatMap((run) => wrongRuleProblem(run) ?? []),
      ...lowMeanProblems(result.datasetName, runs),
    ];
  });

/** Fails the test when an answer acts on the wrong rule, or when a mean is too low. */
export const assertScoreGate = (results: DatasetRunResult[], log: ToolingLog): void => {
  const problems = findScoreGateProblems(results);
  if (problems.length > 0) {
    throw new Error(
      `The coverage review failed the score gate:\n${problems.map((p) => `  - ${p}`).join('\n')}`
    );
  }
  log.info(`Score gate passed: no wrong rule, Verdict and Rule Match means >= ${MIN_MEAN_SCORE}`);
};
