/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition, KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  aesopCollectFailuresInputSchema,
  aesopCollectFailuresStepCommonDefinition,
} from '../../../../common/workflows/step_types/aesop_collect_failures/aesop_collect_failures_step_common';
import type { FailedExample, ScoreDocument } from './collect_failures';
import { groupFailures, mentionsReference, toMarkdown, toText, truncate } from './collect_failures';

const INTERNAL_VERSION_HEADERS = { 'elastic-api-version': '1' };
const EXPERIMENTS_PATH = '/internal/evals/experiments';

// The details route reads `example.input` and `task.output` only; the expected
// output stays in the dataset, which this step never requests.
const readRepetition = async (
  context: StepHandlerContext,
  experimentId: string,
  failure: FailedExample
): Promise<{ question: string; answer: string }> => {
  const path = [
    EXPERIMENTS_PATH,
    encodeURIComponent(experimentId),
    'datasets',
    encodeURIComponent(failure.dataset_id),
    'examples',
    encodeURIComponent(failure.example_id),
    'repetitions',
    String(failure.repetition_index),
  ].join('/');
  try {
    const details = await context.contextManager.callKibanaApi<{
      example?: { input?: unknown };
      task?: { output?: unknown };
    }>({ method: 'GET', path, headers: INTERNAL_VERSION_HEADERS });
    return {
      question: toText(details.body.example?.input),
      answer: toText(details.body.task?.output),
    };
  } catch (error) {
    if (error instanceof KibanaApiCallError && error.status === 404) {
      return { question: '', answer: '' };
    }
    throw error;
  }
};

export const aesopCollectFailuresStepDefinition = createServerStepDefinition({
  ...aesopCollectFailuresStepCommonDefinition,
  handler: async (context) => {
    const parsed = aesopCollectFailuresInputSchema.safeParse(context.input);
    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }
    const input = parsed.data;

    try {
      const scores = await context.contextManager.callKibanaApi<{ scores?: ScoreDocument[] }>({
        method: 'GET',
        path: `${EXPERIMENTS_PATH}/${encodeURIComponent(input.experiment_id)}/scores`,
        headers: INTERNAL_VERSION_HEADERS,
      });
      const groups = groupFailures({
        scores: scores.body.scores ?? [],
        evaluator: input.evaluator,
        threshold: input.threshold,
        maxFailures: input.max_failures,
      });

      const failures = [];
      for (const failure of groups.failures) {
        const { question, answer } = await readRepetition(context, input.experiment_id, failure);
        failures.push({
          example_id: failure.example_id,
          example_index: failure.example_index,
          repetition_index: failure.repetition_index,
          score: failure.score,
          question: truncate(question, input.max_chars),
          answer: truncate(answer, input.max_chars),
          explanation: truncate(failure.explanation, input.max_chars),
          mentions_reference: mentionsReference(failure.explanation),
        });
      }

      return {
        output: {
          scored_examples: groups.scored_examples,
          failed_examples: groups.failed_examples,
          mean_score: groups.mean_score,
          failures,
          mentions_reference_count: failures.filter((f) => f.mentions_reference).length,
          markdown: toMarkdown(failures),
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
