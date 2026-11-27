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
import {
  countingJudgeClient,
  describeJudgeFailure,
  InvalidVerdictError,
  JUDGE_MAX_RETRIES,
  warnSafely,
} from './judge_retry';
import { isRecord } from './task_output_helpers';

export const AD_AXES_RUBRIC_EVALUATOR_NAME = 'AdAxesRubric';

const AXES = ['coverage', 'accuracy', 'correlation', 'actionability'] as const;

const unavailable = (
  explanation: string,
  metadata?: EvaluationResult['metadata']
): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation,
  ...(metadata ? { metadata } : {}),
});

/** Rounds a numeric score to the nearest integer; undefined when it is not a finite number in range. */
const normalizeScore = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded >= AD_AXES_MIN_SCORE && rounded <= AD_AXES_MAX_SCORE ? rounded : undefined;
};

const serializeInsights = (insights: unknown[]): string =>
  JSON.stringify({ attackDiscoveries: insights }, null, 2);

// Framing of `serializeInsights` around a non-empty list, so a prefix's length can be summed.
const LIST_HEAD = '{\n  "attackDiscoveries": [\n';
const LIST_TAIL = '\n  ]\n}';
const ITEM_SEPARATOR = ',\n';

/** Length of one insight as it appears inside the pretty-printed list (indented four spaces). */
const serializedItemLength = (insight: unknown): number =>
  4 + (JSON.stringify(insight, null, 2) ?? 'null').replace(/\n/g, '\n    ').length;

/**
 * Serializes the insights for the judge. When the JSON would exceed the cap,
 * whole trailing insights are dropped (never a sliced JSON document) and the
 * note tells the judge how many were omitted. `keptCount` is 0 when even the
 * first insight does not fit.
 */
export const toSubmission = (
  insights: unknown[]
): { submission: string; truncationNote: string; keptCount: number } => {
  let keptCount = insights.length;
  let submission = serializeInsights(insights);
  if (submission.length > AD_AXES_MAX_SUBMISSION_CHARS) {
    let total = LIST_HEAD.length + LIST_TAIL.length;
    keptCount = 0;
    for (const insight of insights) {
      const next =
        total + serializedItemLength(insight) + (keptCount > 0 ? ITEM_SEPARATOR.length : 0);
      if (next > AD_AXES_MAX_SUBMISSION_CHARS) break;
      total = next;
      keptCount++;
    }
    submission = serializeInsights(insights.slice(0, keptCount));
    // Guard against a length estimate that disagrees with the real serialization.
    while (submission.length > AD_AXES_MAX_SUBMISSION_CHARS && keptCount > 0) {
      keptCount--;
      submission = serializeInsights(insights.slice(0, keptCount));
    }
  }
  const omitted = insights.length - keptCount;
  return {
    submission,
    keptCount,
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

    const { keptCount, ...input } = toSubmission(insights);
    if (insights.length > 0 && keptCount === 0) {
      return unavailable(
        `Even one discovery exceeds the ${AD_AXES_MAX_SUBMISSION_CHARS}-character size cap, so there is nothing the judge could grade.`
      );
    }

    const judge = countingJudgeClient(inferenceClient);
    try {
      const response = await executeUntilValid({
        prompt: AdAxesRubricPrompt,
        inferenceClient: judge.client,
        input,
        finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
        maxRetries: JUDGE_MAX_RETRIES,
        toolCallbacks: {
          // A throw is caught by executeUntilValid, which retries once and passes the error to the
          // judge as the tool result; InvalidVerdictError keeps its message through JSON.stringify.
          grade: async (toolCall) => {
            const args = toolCall.function.arguments;
            if (
              !isRecord(args) ||
              [args.overall, ...AXES.map((axis) => args[axis])].some(
                (v) => normalizeScore(v) === undefined
              )
            ) {
              throw new InvalidVerdictError(
                `overall and every axis score must be a number between ${AD_AXES_MIN_SCORE} and ${AD_AXES_MAX_SCORE}`
              );
            }
            return { response: args };
          },
        },
      });

      const args = response.toolCalls[0]?.function.arguments;
      if (!isRecord(args)) {
        return unavailable('Judge did not return a grade.', { judge_calls: judge.calls() });
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
        return unavailable('Judge returned a missing or out-of-range axis score.', {
          judge_calls: judge.calls(),
        });
      }

      return {
        score: overall / AD_AXES_MAX_SCORE,
        label: String(overall),
        explanation: typeof args.explanation === 'string' ? args.explanation : '',
        metadata: {
          coverage,
          accuracy,
          correlation,
          actionability,
          overall,
          judge_calls: judge.calls(),
        },
      };
    } catch (error) {
      const message = describeJudgeFailure(error);
      warnSafely(log, `[persona-matrix] ${AD_AXES_RUBRIC_EVALUATOR_NAME} judge failed: ${message}`);
      return unavailable(`Judge call failed: ${message}`.slice(0, 1000), {
        judge_calls: judge.calls(),
      });
    }
  },
});
