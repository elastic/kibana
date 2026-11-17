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
  buildPersonaRubricInput,
  PERSONA_RUBRIC_MAX_SCORE,
  PERSONA_RUBRIC_MIN_SCORE,
  PersonaRubricPrompt,
  resolvePersonaToolsRow,
} from './persona_rubric_prompt';
import type { WorkflowAttachmentInput } from './persona_rubric_prompt';
import {
  countingJudgeClient,
  describeJudgeFailure,
  InvalidVerdictError,
  JUDGE_MAX_RETRIES,
  warnSafely,
} from './judge_retry';
import { NO_TOOL_CALL_RUBRIC_CAP } from './rubric_cap_no_tool_call_evaluator';
import { getAnswerText, getSteps, isRecord } from './task_output_helpers';

export const PERSONA_RUBRIC_EVALUATOR_NAME = 'PersonaRubric';

/** Opt-in: the extra judge call per cell is off unless this is `1`. */
export const PERSONA_RUBRIC_JUDGE_ENV = 'PERSONA_MATRIX_RUBRIC_JUDGE';

export const isPersonaRubricJudgeEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env[PERSONA_RUBRIC_JUDGE_ENV]?.trim() === '1';

const unavailable = (
  explanation: string,
  metadata?: EvaluationResult['metadata']
): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation,
  ...(metadata ? { metadata } : {}),
});

const getToolCallsWithResults = (output: unknown) =>
  getSteps(output).flatMap((step) =>
    step.type === 'tool_call' && typeof step.tool_id === 'string'
      ? [
          {
            tool_id: step.tool_id,
            params: isRecord(step.params) ? step.params : {},
            results: step.results,
          },
        ]
      : []
  );

const parseScore = (args: unknown): { score: number; explanation: string } | undefined => {
  if (!isRecord(args)) return undefined;
  const { score: rawScore, explanation } = args;
  if (typeof rawScore !== 'number' || !Number.isFinite(rawScore)) return undefined;
  const score = Math.round(rawScore);
  if (score < PERSONA_RUBRIC_MIN_SCORE || score > PERSONA_RUBRIC_MAX_SCORE) return undefined;
  return { score, explanation: typeof explanation === 'string' ? explanation : '' };
};

/**
 * Grades one judged submission. Never throws: a judge failure or malformed
 * verdict degrades to an "unavailable" result so the cell keeps its other scores.
 */
export const runPersonaRubricJudge = async ({
  inferenceClient,
  category,
  expectedTools,
  question,
  attachment,
  judgeOutput,
  workflowAttachments,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  category: string | undefined;
  expectedTools?: readonly string[];
  question?: string;
  attachment?: string;
  judgeOutput: unknown;
  /** `generate_workflow` results carry only ids, so the authored YAML comes from here. */
  workflowAttachments?: readonly WorkflowAttachmentInput[];
  log?: ToolingLog;
}): Promise<EvaluationResult> => {
  if (!category || !resolvePersonaToolsRow(category)) {
    const reason = `Example category ${
      category ? `"${category}"` : '(missing)'
    } has no persona rubric tools row.`;
    warnSafely(log, `[persona-matrix] PersonaRubric skipped: ${reason}`);
    return unavailable(reason);
  }
  const toolCalls = getToolCallsWithResults(judgeOutput);
  const judge = countingJudgeClient(inferenceClient);
  try {
    const response = await executeUntilValid({
      prompt: PersonaRubricPrompt,
      inferenceClient: judge.client,
      input: buildPersonaRubricInput({
        category,
        expectedTools,
        question,
        attachment,
        answer: getAnswerText(judgeOutput),
        toolCalls,
        workflowAttachments,
      }),
      finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
      maxRetries: JUDGE_MAX_RETRIES,
      toolCallbacks: {
        // A throw is caught by executeUntilValid, which retries once and passes the error to the
        // judge as the tool result; InvalidVerdictError keeps its message through JSON.stringify.
        grade: async (toolCall) => {
          if (!parseScore(toolCall.function.arguments)) {
            throw new InvalidVerdictError(
              `score must be an integer between ${PERSONA_RUBRIC_MIN_SCORE} and ${PERSONA_RUBRIC_MAX_SCORE}`
            );
          }
          return { response: toolCall.function.arguments };
        },
      },
    });

    const verdict = parseScore(response.toolCalls[0]?.function.arguments);
    if (!verdict) {
      return unavailable('Judge returned no integer score between 1 and 10.', {
        judge_calls: judge.calls(),
      });
    }

    const capped = toolCalls.length === 0;
    const finalScore = capped ? Math.min(verdict.score, NO_TOOL_CALL_RUBRIC_CAP) : verdict.score;
    return {
      score: finalScore / PERSONA_RUBRIC_MAX_SCORE,
      label: String(finalScore),
      explanation: verdict.explanation,
      metadata: {
        raw_score: verdict.score,
        capped_score: finalScore,
        capped,
        category,
        judge_calls: judge.calls(),
      },
    };
  } catch (error) {
    const message = describeJudgeFailure(error);
    warnSafely(log, `[persona-matrix] PersonaRubric judge failed: ${message}`);
    return unavailable(`Judge call failed: ${message}`.slice(0, 1000), {
      judge_calls: judge.calls(),
    });
  }
};

/** Reads the verdict the task precomputed on the same judged submission. */
export const createPersonaRubricEvaluator = ({
  getModel,
}: { getModel?: Evaluator['getModel'] } = {}): Evaluator => ({
  name: PERSONA_RUBRIC_EVALUATOR_NAME,
  kind: 'LLM',
  direction: 'maximize',
  getModel,
  evaluate: async ({ output }) =>
    (output as { personaRubricAnalysis?: EvaluationResult } | undefined)?.personaRubricAnalysis ??
    unavailable('PersonaRubric judge did not produce a result for this example.'),
});
