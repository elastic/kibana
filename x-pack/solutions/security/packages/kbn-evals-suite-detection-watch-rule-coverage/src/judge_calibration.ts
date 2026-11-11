/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { DefaultEvaluators, EvaluationResult, Evaluator } from '@kbn/evals';
import type { CalibrationExample } from '../datasets/rationale_calibration';
import { judgeRationale, RATIONALE_CRITERIA } from './evaluators';
import { RuleLookup } from './rule_evidence';
import type { CoverageCheckResult } from './types';

/** Ids of the questions that the judge answered FAIL. */
const failedQuestions = ({ metadata }: EvaluationResult): string[] => {
  const criteria = metadata?.criteria;
  if (!Array.isArray(criteria)) {
    return [];
  }
  return criteria.flatMap((criterion: { id?: unknown; result?: unknown }) =>
    criterion.result === 'FAIL' ? [String(criterion.id)] : []
  );
};

/**
 * 1 when the rationale judge gave the expected result: it passed a correct answer, or it
 * failed a bad answer on the question that the fault breaks.
 */
export const createJudgeCalibrationEvaluator = ({
  evaluators,
  fetch,
}: {
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
}): Evaluator<CalibrationExample, CoverageCheckResult> => {
  const judge = evaluators.criteria(RATIONALE_CRITERIA);
  const rules = new RuleLookup(fetch);
  return {
    name: 'Judge Calibration',
    kind: 'LLM',
    direction: 'maximize',
    getModel: judge.getModel,
    evaluate: async ({ input, output, expected }) => {
      const result = await judgeRationale({ judge, rules, indicator: input.indicator, output });
      const failed = failedQuestions(result);
      const metadata = { judgeScore: result.score ?? null, failedQuestions: failed };

      if (expected.judgeShouldPass) {
        const passed = result.score === 1;
        return {
          score: passed ? 1 : 0,
          label: passed ? 'passed_good_answer' : 'failed_good_answer',
          explanation: result.explanation ?? null,
          metadata,
        };
      }
      const caught = expected.mustFailOneOf.some((id) => failed.includes(id));
      return {
        score: caught ? 1 : 0,
        label: caught ? 'caught_bad_answer' : 'missed_bad_answer',
        explanation: result.explanation ?? null,
        metadata,
      };
    },
  };
};
