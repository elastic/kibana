/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluateFn } from '@kbn/evals-plugin/server';
import type {
  OnlineEvalError,
  OnlineEvalScore,
  OnlineEvalScoreEvent,
} from '../telemetry/online_eval_score_event';

export type EvaluateResult = Awaited<ReturnType<EvaluateFn>>[number];

/** What the caller knows about the scored run; the rest of the event comes from the results. */
export type OnlineEvalScoreMetadata = Omit<
  OnlineEvalScoreEvent,
  | 'judge_model'
  | 'judge_input_tokens'
  | 'judge_cached_input_tokens'
  | 'judge_output_tokens'
  | 'judge_reasoning_tokens'
  | 'judge_llm_calls'
  | 'judge_llm_calls_without_usage'
  | 'scores'
  | 'evaluator_count'
  | 'failed_count'
  | 'skipped_count'
  | 'errors'
  | 'explanations_included'
  | 'explanations_dropped'
  | 'scores_dropped'
>;

export const MAX_EXPLANATION_LENGTH = 400;
const MAX_LABEL_LENGTH = 256;

/**
 * The server shipper sends about 10 KiB per batch, and the analytics context every event carries
 * takes part of that.
 */
export const MAX_SCORE_EVENT_BYTES = 8 * 1024;

const truncate = (value: string, maxLength: number): string => {
  const characters = Array.from(value);
  return characters.length <= maxLength ? value : `${characters.slice(0, maxLength - 1).join('')}…`;
};

const toScores = (results: EvaluateResult[], includeExplanations: boolean): OnlineEvalScore[] =>
  results.flatMap(({ evaluator, scores = [] }) =>
    scores.map(({ name, score, label, explanation }) => ({
      evaluator_name: evaluator.name,
      evaluator_version: evaluator.version,
      name,
      ...(typeof score === 'number' ? { value: score } : {}),
      ...(label ? { label: truncate(label, MAX_LABEL_LENGTH) } : {}),
      ...(includeExplanations && explanation
        ? { explanation: truncate(explanation, MAX_EXPLANATION_LENGTH) }
        : {}),
    }))
  );

const toErrors = (results: EvaluateResult[]): OnlineEvalError[] =>
  results
    .filter(({ status }) => status === 'error')
    .map(({ evaluator, error }) => ({
      evaluator_name: evaluator.name,
      evaluator_version: evaluator.version,
      code: error?.code ?? 'evaluator_error',
    }));

type JudgeUsage = Pick<
  OnlineEvalScoreEvent,
  | 'judge_input_tokens'
  | 'judge_cached_input_tokens'
  | 'judge_output_tokens'
  | 'judge_reasoning_tokens'
  | 'judge_llm_calls'
  | 'judge_llm_calls_without_usage'
>;

/** Sums the judges' token usage, or nothing when no judge made a model call. */
const toJudgeUsage = (results: EvaluateResult[]): JudgeUsage => {
  const usages = results.flatMap(({ usage }) => (usage ? [usage] : []));
  if (usages.length === 0) {
    return {};
  }
  const sum = (read: (usage: (typeof usages)[number]) => number | undefined) =>
    usages.reduce((total, usage) => total + (read(usage) ?? 0), 0);
  const sumReported = (read: (usage: (typeof usages)[number]) => number | undefined) =>
    usages.some((usage) => read(usage) !== undefined) ? sum(read) : undefined;
  const cached = sumReported(({ cached_input_tokens: tokens }) => tokens);
  const reasoning = sumReported(({ reasoning_tokens: tokens }) => tokens);

  return {
    judge_input_tokens: sum(({ input_tokens: tokens }) => tokens),
    ...(cached === undefined ? {} : { judge_cached_input_tokens: cached }),
    judge_output_tokens: sum(({ output_tokens: tokens }) => tokens),
    ...(reasoning === undefined ? {} : { judge_reasoning_tokens: reasoning }),
    judge_llm_calls: sum(({ llm_calls: calls }) => calls),
    judge_llm_calls_without_usage: sum(({ llm_calls_without_usage: calls }) => calls),
  };
};

const withDropCounts = (
  event: OnlineEvalScoreEvent,
  scores: OnlineEvalScore[],
  explanationsDropped: number,
  scoresDropped: number
): OnlineEvalScoreEvent => ({
  ...event,
  scores,
  ...(explanationsDropped > 0 ? { explanations_dropped: explanationsDropped } : {}),
  ...(scoresDropped > 0 ? { scores_dropped: scoresDropped } : {}),
});

const fits = (event: OnlineEvalScoreEvent): boolean =>
  Buffer.byteLength(JSON.stringify(event), 'utf8') <= MAX_SCORE_EVENT_BYTES;

/**
 * Drops explanations, then scores, from the end until the event fits or no scores are left.
 * Server-side batches aren't retried, so an oversized event could lose the batch it's sent in.
 */
const fitToSizeLimit = (event: OnlineEvalScoreEvent): OnlineEvalScoreEvent => {
  const scores = [...event.scores];
  let explanationsDropped = 0;
  let scoresDropped = 0;
  const current = () => withDropCounts(event, scores, explanationsDropped, scoresDropped);

  for (let index = scores.length - 1; index >= 0 && !fits(current()); index--) {
    const { explanation, ...rest } = scores[index];
    if (explanation !== undefined) {
      scores[index] = rest;
      explanationsDropped++;
    }
  }
  while (scores.length > 0 && !fits(current())) {
    scores.pop();
    scoresDropped++;
  }

  return current();
};

/**
 * Builds the score event for one scored run. Explanations are included only when
 * `includeExplanations` is true, because they may quote customer data. `failedEvaluators` are
 * the evaluators of an evaluation that failed as a whole, so none of them ran.
 */
export const buildOnlineEvalScoreEvent = ({
  metadata,
  results,
  failedEvaluators = [],
  includeExplanations,
}: {
  metadata: OnlineEvalScoreMetadata;
  results: EvaluateResult[];
  failedEvaluators?: ReadonlyArray<{ name: string; version?: string }>;
  includeExplanations: boolean;
}): OnlineEvalScoreEvent => {
  const errors: OnlineEvalError[] = [
    ...toErrors(results),
    ...failedEvaluators.map(({ name, version }) => ({
      evaluator_name: name,
      ...(version ? { evaluator_version: version } : {}),
      code: 'evaluation_failed' as const,
    })),
  ];
  const skippedCount = errors.filter(
    ({ code }) => code === 'evidence_unmet' || code === 'not_applicable'
  ).length;
  // Online evals run every judge on one fixed model, so one value covers the event.
  const judgeModel = results.find(({ evaluator }) => evaluator.model)?.evaluator.model?.id;

  return fitToSizeLimit({
    ...metadata,
    ...(judgeModel ? { judge_model: judgeModel } : {}),
    ...toJudgeUsage(results),
    scores: toScores(results, includeExplanations),
    evaluator_count: results.length + failedEvaluators.length,
    failed_count: errors.length - skippedCount,
    skipped_count: skippedCount,
    errors,
    explanations_included: includeExplanations,
  });
};
