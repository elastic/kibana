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
  | 'scores'
  | 'evaluator_count'
  | 'failed_count'
  | 'skipped_count'
  | 'errors'
  | 'explanations_included'
  | 'explanations_dropped'
  | 'scores_dropped'
>;

export const MAX_EXPLANATION_LENGTH = 500;
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
      code: error?.code === 'evidence_unmet' ? 'evidence_unmet' : 'evaluator_error',
    }));

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
 * `includeExplanations` is true, because they may quote customer data.
 */
export const buildOnlineEvalScoreEvent = ({
  metadata,
  results,
  includeExplanations,
}: {
  metadata: OnlineEvalScoreMetadata;
  results: EvaluateResult[];
  includeExplanations: boolean;
}): OnlineEvalScoreEvent => {
  const errors = toErrors(results);
  const skippedCount = errors.filter(({ code }) => code === 'evidence_unmet').length;
  // Online evals run every judge on one fixed model, so one value covers the event.
  const judgeModel = results.find(({ evaluator }) => evaluator.model)?.evaluator.model?.id;

  return fitToSizeLimit({
    ...metadata,
    ...(judgeModel ? { judge_model: judgeModel } : {}),
    scores: toScores(results, includeExplanations),
    evaluator_count: results.length,
    failed_count: errors.length - skippedCount,
    skipped_count: skippedCount,
    errors,
    explanations_included: includeExplanations,
  });
};
