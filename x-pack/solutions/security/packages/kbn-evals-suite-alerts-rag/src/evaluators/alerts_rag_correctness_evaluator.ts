/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { withRetry } from '@kbn/evals';
import type { AlertsRagDatasetExample, AlertsRagTaskOutput } from '../evaluate_dataset';
import { ALERTS_RAG_THRESHOLDS } from '../thresholds';

const EVALUATOR_NAME = 'AnswerCorrectness';

const SYSTEM_PROMPT = `You are an expert evaluator assessing the correctness of a RAG system answer against a reference answer.
Correctness means the generated answer conveys the same key facts and conclusions as the reference answer.
Minor phrasing differences are acceptable; missing or contradicted facts reduce the score.

Respond with a valid JSON object only — no markdown, no explanation outside the JSON.
Schema: { "score": <number 0.0–1.0>, "reasoning": "<one sentence>" }
Where 1.0 = fully correct (all key facts match), 0.0 = completely incorrect (contradicts or omits all key facts).`;

const buildUserPrompt = (question: string, reference: string, answer: string): string =>
  `Question: ${question}

Reference answer:
${reference}

Generated answer to evaluate:
${answer}

Rate how correct the generated answer is relative to the reference answer.`;

const parseCorrectnessResponse = (content: string): { score: number; reasoning: string } | null => {
  try {
    const parsed = JSON.parse(content);
    if (
      typeof parsed.score === 'number' &&
      parsed.score >= 0 &&
      parsed.score <= 1 &&
      typeof parsed.reasoning === 'string'
    ) {
      return { score: parsed.score, reasoning: parsed.reasoning };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * LLM-as-judge evaluator that measures how well the generated answer matches the
 * reference answer. Scores 0.0 (completely wrong) to 1.0 (perfectly correct).
 */
export const createAlertsCorrectnessEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput> => ({
  name: EVALUATOR_NAME,
  kind: 'LLM',
  evaluate: async ({ input, output, expected }) => {
    const question = input?.question ?? '';
    const answer = output?.answer ?? '';
    const reference = expected?.reference ?? '';

    if (!answer.trim()) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No answer to evaluate',
      };
    }

    if (!reference.trim()) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No reference answer provided',
      };
    }

    const userPrompt = buildUserPrompt(question, reference, answer);

    try {
      const response = await withRetry(
        () =>
          inferenceClient.chatComplete({
            system: SYSTEM_PROMPT,
            messages: [{ role: MessageRole.User, content: userPrompt }],
          }),
        {
          label: `${EVALUATOR_NAME} chatComplete`,
          onRetry: ({ attempt, maxAttempts, delayMs, error }) => {
            log.warning(
              `${EVALUATOR_NAME}: chatComplete rate limited (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms. Error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          },
        }
      );

      const parsed = parseCorrectnessResponse(response.content);
      if (!parsed) {
        log.warning(`AnswerCorrectness evaluator: unparseable response: ${response.content}`);
        return {
          score: null,
          label: 'error',
          explanation: 'LLM returned an unparseable correctness score',
        };
      }

      const label =
        parsed.score >= ALERTS_RAG_THRESHOLDS.CORRECTNESS_PARTIAL
          ? 'correct'
          : parsed.score >= ALERTS_RAG_THRESHOLDS.CORRECTNESS_PASSING
          ? 'partial'
          : 'incorrect';
      log.debug(
        `${EVALUATOR_NAME}: score=${parsed.score} label="${label}" reasoning="${parsed.reasoning}"`
      );
      return {
        score: parsed.score,
        label,
        explanation: parsed.reasoning,
      };
    } catch (err) {
      log.error(new Error('AnswerCorrectness evaluator failed', { cause: err }));
      return {
        score: null,
        label: 'error',
        explanation: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
