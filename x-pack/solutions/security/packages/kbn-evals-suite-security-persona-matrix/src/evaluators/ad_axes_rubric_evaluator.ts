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

const isValidScore = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= AD_AXES_MIN_SCORE &&
  value <= AD_AXES_MAX_SCORE;

const toSubmission = (insights: unknown): string => {
  const serialized = JSON.stringify({ attackDiscoveries: insights }, null, 2);
  return serialized.length > AD_AXES_MAX_SUBMISSION_CHARS
    ? serialized.slice(0, AD_AXES_MAX_SUBMISSION_CHARS)
    : serialized;
};

/**
 * Four-axis Attack Discovery judge. Never throws: a judge failure or a
 * malformed verdict degrades to "unavailable" so the cell keeps its other scores.
 */
export const createAdAxesRubricEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log?: ToolingLog;
}): Evaluator => ({
  name: AD_AXES_RUBRIC_EVALUATOR_NAME,
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const insights = isRecord(output) ? output.insights : undefined;
    if (!Array.isArray(insights)) {
      return unavailable('Attack Discovery task did not produce insights.');
    }

    try {
      const response = await executeUntilValid({
        prompt: AdAxesRubricPrompt,
        inferenceClient,
        input: { submission: toSubmission(insights) },
        finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
        maxRetries: 3,
        toolCallbacks: {
          grade: async (toolCall) => ({ response: toolCall.function.arguments }),
        },
      });

      const args = response.toolCalls[0]?.function.arguments;
      if (
        !isRecord(args) ||
        !isValidScore(args.overall) ||
        !AXES.every((a) => isValidScore(args[a]))
      ) {
        return unavailable('Judge returned a missing or out-of-range axis score.');
      }

      return {
        score: args.overall / AD_AXES_MAX_SCORE,
        label: String(args.overall),
        explanation: typeof args.explanation === 'string' ? args.explanation : '',
        metadata: {
          coverage: args.coverage,
          accuracy: args.accuracy,
          correlation: args.correlation,
          actionability: args.actionability,
          overall: args.overall,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log?.warning(`[persona-matrix] ${AD_AXES_RUBRIC_EVALUATOR_NAME} judge failed: ${message}`);
      return unavailable(`Judge call failed: ${message}`.slice(0, 1000));
    }
  },
});
