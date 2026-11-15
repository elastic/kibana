/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { EvaluationResult, Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  AD_AXES_MAX_SCORE,
  AD_AXES_MAX_SUBMISSION_CHARS,
  AD_AXES_MIN_SCORE,
  AdAxesRubricPrompt,
} from './ad_axes_rubric_prompt';
import { isRecord } from './task_output_helpers';

export const AD_AXES_RUBRIC_EVALUATOR_NAME = 'AdAxesRubric';

const AXES = ['coverage', 'accuracy', 'correlation', 'actionability'] as const;

const unavailable = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation,
});

/** Rounds a numeric score to the nearest integer; undefined when it is not a finite number in range. */
const normalizeScore = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded >= AD_AXES_MIN_SCORE && rounded <= AD_AXES_MAX_SCORE ? rounded : undefined;
};

const serializeInsights = (insights: unknown[]): string =>
  JSON.stringify({ attackDiscoveries: insights }, null, 2);

/**
 * Serializes the insights for the judge. When the JSON would exceed the cap,
 * whole trailing insights are dropped (never a sliced JSON document) and the
 * note tells the judge how many were omitted.
 */
export const toSubmission = (
  insights: unknown[]
): { submission: string; truncationNote: string } => {
  let kept = insights;
  let submission = serializeInsights(kept);
  while (submission.length > AD_AXES_MAX_SUBMISSION_CHARS && kept.length > 0) {
    kept = kept.slice(0, -1);
    submission = serializeInsights(kept);
  }
  const omitted = insights.length - kept.length;
  return {
    submission,
    truncationNote:
      omitted > 0
        ? `[truncated: ${omitted} of ${insights.length} discoveries omitted to fit the size limit; do not penalize the missing ones as absent from the model's output.]\n\n`
        : '',
  };
};

/**
 * Four-axis Attack Discovery judge. Never throws: a judge failure or a
 * malformed verdict degrades to "unavailable" so the cell keeps its other scores.
 */
export const createAdAxesRubricEvaluator = ({
  inferenceClient,
  log,
  getModel,
}: {
  inferenceClient: BoundInferenceClient;
  log?: ToolingLog;
  getModel?: Evaluator['getModel'];
}): Evaluator => ({
  name: AD_AXES_RUBRIC_EVALUATOR_NAME,
  kind: 'LLM',
  direction: 'maximize',
  getModel,
  evaluate: async ({ output }) => {
    const insights = isRecord(output) ? output.insights : undefined;
    if (!Array.isArray(insights)) {
      return unavailable('Attack Discovery task did not produce insights.');
    }

    try {
      const response = await executeUntilValid({
        prompt: AdAxesRubricPrompt,
        inferenceClient,
        input: toSubmission(insights),
        finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
        maxRetries: 3,
        toolCallbacks: {
          grade: async (toolCall) => ({ response: toolCall.function.arguments }),
        },
      });

      const args = response.toolCalls[0]?.function.arguments;
      if (!isRecord(args)) {
        return unavailable('Judge did not return a grade.');
      }
      const overall = normalizeScore(args.overall);
      const [coverage, accuracy, correlation, actionability] = AXES.map((axis) =>
        normalizeScore(args[axis])
      );
      if (
        overall === undefined ||
        coverage === undefined ||
        accuracy === undefined ||
        correlation === undefined ||
        actionability === undefined
      ) {
        return unavailable('Judge returned a missing or out-of-range axis score.');
      }

      return {
        score: overall / AD_AXES_MAX_SCORE,
        label: String(overall),
        explanation: typeof args.explanation === 'string' ? args.explanation : '',
        metadata: { coverage, accuracy, correlation, actionability, overall },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log?.warning(`[persona-matrix] ${AD_AXES_RUBRIC_EVALUATOR_NAME} judge failed: ${message}`);
      return unavailable(`Judge call failed: ${message}`.slice(0, 1000));
    }
  },
});
