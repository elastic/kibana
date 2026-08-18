/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import { CLASSIFICATIONS, type Classification } from './constants';
import type { AlertAnalysisVerdict } from './workflow_task';

interface ExpectedVerdict {
  classification: Classification;
}

const asVerdict = (output: unknown): AlertAnalysisVerdict => output as AlertAnalysisVerdict;
const asExpected = (expected: unknown): ExpectedVerdict | undefined =>
  expected as ExpectedVerdict | undefined;

/**
 * Primary metric: did the workflow's `ai.agent` step classify the alert the same way as
 * the golden label? Binary per example; the mean across a dataset is the workflow's
 * true-positive/false-positive accuracy for the model under test.
 */
export const classificationAccuracy: Evaluator = {
  name: 'ClassificationAccuracy',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const predicted = asVerdict(output).classification;
    const goldenLabel = asExpected(expected)?.classification;
    const correct = predicted != null && predicted === goldenLabel;

    return {
      score: correct ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${goldenLabel ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: goldenLabel ?? null,
        confidenceScore: asVerdict(output).confidenceScore ?? null,
        executionStatus: asVerdict(output).executionStatus,
      },
    };
  },
};

/**
 * Guardrail: the structured output must be a well-formed verdict — a classification from
 * the workflow's enum and a confidence score in [0, 1]. Catches schema drift and failed
 * executions (no verdict) independently of whether the label was correct.
 */
export const validVerdict: Evaluator = {
  name: 'ValidVerdict',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const verdict = asVerdict(output);
    const classificationValid =
      verdict.classification != null &&
      (CLASSIFICATIONS as readonly string[]).includes(verdict.classification);
    const confidenceValid =
      typeof verdict.confidenceScore === 'number' &&
      verdict.confidenceScore >= 0 &&
      verdict.confidenceScore <= 1;
    const valid = classificationValid && confidenceValid;

    return {
      score: valid ? 1 : 0,
      label: valid ? 'valid' : 'invalid',
      metadata: {
        classificationValid,
        confidenceValid,
        executionStatus: verdict.executionStatus,
      },
    };
  },
};

/**
 * L2 guardrail: the workflow pre-builds context, so the `ai.agent` step should not call tools.
 * Golden path is empty; any tool call fails trajectory.
 */
export const createAlertAnalysisTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => asVerdict(output).toolCallIds ?? [],
    goldenPathExtractor: () => [],
    orderWeight: 1,
    coverageWeight: 0,
  });

  return {
    ...inner,
    name: 'trajectory',
    evaluate: async (args) => {
      if (asVerdict(args.output).toolCallsUnavailable) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Workflow trace unavailable — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};
