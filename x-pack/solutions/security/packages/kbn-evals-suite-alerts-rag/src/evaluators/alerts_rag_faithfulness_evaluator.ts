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
import type { AlertDocument } from '../dataset';
import { ALERTS_RAG_THRESHOLDS } from '../thresholds';

const EVALUATOR_NAME = 'Faithfulness';

const buildContextSummary = (context: AlertDocument[]): string =>
  context
    .map(
      (doc) =>
        `[${doc._id}] rule="${doc._source.kibana.alert.rule.name}" ` +
        `severity=${doc._source.kibana.alert.severity} ` +
        `status=${doc._source.kibana.alert.status} ` +
        `ts=${doc._source['@timestamp']}${
          doc._source.host ? ` host=${doc._source.host.name}` : ''
        }${doc._source.user ? ` user=${doc._source.user.name}` : ''}`
    )
    .join('\n');

const SYSTEM_PROMPT = `You are an expert evaluator assessing the faithfulness of a RAG system answer.
Faithfulness means every factual claim in the answer must be directly supported by the provided context.
An answer is unfaithful if it adds facts, inferences, or conclusions not found in the context.

Respond with a valid JSON object only — no markdown, no explanation outside the JSON.
Schema: { "score": <number 0.0–1.0>, "reasoning": "<one sentence>" }
Where 1.0 = fully faithful, 0.0 = completely unfaithful.`;

const buildUserPrompt = (question: string, contextText: string, answer: string): string =>
  `Context (alert documents):
${contextText}

Question: ${question}

Answer to evaluate:
${answer}

Rate the faithfulness of the answer to the context.`;

const parseFaithfulnessResponse = (
  content: string
): { score: number; reasoning: string } | null => {
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
 * LLM-as-judge evaluator that verifies the generated answer is grounded in the retrieved
 * alert context. Scores 0.0 (fully unfaithful) to 1.0 (fully faithful).
 */
export const createAlertsFaithfulnessEvaluator = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput> => ({
  name: EVALUATOR_NAME,
  kind: 'LLM',
  evaluate: async ({ input, output }) => {
    const { question, context } = input ?? { question: '', context: [] };
    const answer = output?.answer ?? '';

    if (!answer.trim() || context.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: answer.trim() ? 'No context provided' : 'No answer to evaluate',
      };
    }

    const contextText = buildContextSummary(context);
    const userPrompt = buildUserPrompt(question, contextText, answer);

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

      const parsed = parseFaithfulnessResponse(response.content);
      if (!parsed) {
        log.warning(`Faithfulness evaluator: unparseable response: ${response.content}`);
        return {
          score: null,
          label: 'error',
          explanation: 'LLM returned an unparseable faithfulness score',
        };
      }

      const label =
        parsed.score >= ALERTS_RAG_THRESHOLDS.FAITHFULNESS_PARTIAL
          ? 'faithful'
          : parsed.score >= ALERTS_RAG_THRESHOLDS.FAITHFULNESS_PASSING
          ? 'partial'
          : 'unfaithful';
      log.debug(
        `${EVALUATOR_NAME}: score=${parsed.score} label="${label}" reasoning="${parsed.reasoning}"`
      );
      return {
        score: parsed.score,
        label,
        explanation: parsed.reasoning,
      };
    } catch (err) {
      log.error(new Error('Faithfulness evaluator failed', { cause: err }));
      return {
        score: null,
        label: 'error',
        explanation: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
