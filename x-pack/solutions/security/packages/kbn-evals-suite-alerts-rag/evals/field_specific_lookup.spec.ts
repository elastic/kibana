/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, withRetry } from '@kbn/evals';
import type { Evaluator } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { filterByCategory } from '../src/datasets';
import type { AlertsRagDatasetExample, AlertsRagTaskOutput } from '../src/evaluate_dataset';
import { buildAlertContextText, toDatasetExample } from '../src/evaluate_dataset';
import { createAlertsFaithfulnessEvaluator } from '../src/evaluators/alerts_rag_faithfulness_evaluator';
import { createAlertsCorrectnessEvaluator } from '../src/evaluators/alerts_rag_correctness_evaluator';

const CHAT_COMPLETE_PATH = '/api/security_ai_assistant/chat/complete';
const CHAT_COMPLETE_API_VERSION = '2023-10-31';

const DATASET_NAME = 'Alerts RAG – Field-Specific Lookups';
const DATASET_DESCRIPTION =
  'Validates Security AI Assistant accuracy for field-specific alert queries (host.name, user.name) ' +
  'by invoking the Security AI Assistant conversation API directly.';

interface ChatCompleteApiResponse {
  data?: string;
  status?: string;
  connector_id?: string;
}

evaluate.describe('Alerts RAG – Field-Specific Lookups', { tag: tags.stateful.classic }, () => {
  const examples = filterByCategory('field_specific_lookup');

  evaluate(
    `field-specific lookups (${examples.length} examples) via Security AI Assistant API`,
    async ({ kbnClient, connector, executorClient, inferenceClient, log }) => {
      const wrappedExamples = examples.map(toDatasetExample);

      const evaluators: Array<Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput>> = [
        createAlertsFaithfulnessEvaluator({ inferenceClient, log }),
        createAlertsCorrectnessEvaluator({ inferenceClient, log }),
      ];

      await executorClient.runExperiment(
        {
          dataset: {
            name: DATASET_NAME,
            description: DATASET_DESCRIPTION,
            examples: wrappedExamples,
          },
          task: async (example): Promise<AlertsRagTaskOutput> => {
            const input = example.input;
            if (!input) {
              return { answer: '' };
            }
            const { question, context } = input;
            const contextText = buildAlertContextText(context);
            const questionPreview = `${question.slice(0, 120)}${
              question.length > 120 ? '...' : ''
            }`;

            log.info(
              `[field-specific-lookup] API request: connector=${connector.id} question="${questionPreview}" context=${context.length} alert(s)`
            );
            log.debug(
              `[field-specific-lookup] API request body: ${JSON.stringify(
                {
                  connectorId: connector.id,
                  persist: false,
                  isStream: false,
                  messages: [
                    {
                      role: 'user',
                      content: `Here are the security alerts:\n\n${contextText}\n\nQuestion: ${question}`,
                    },
                  ],
                },
                null,
                2
              )}`
            );

            try {
              const response = await withRetry(
                () =>
                  kbnClient.request<ChatCompleteApiResponse>({
                    path: CHAT_COMPLETE_PATH,
                    method: 'POST',
                    headers: { 'elastic-api-version': CHAT_COMPLETE_API_VERSION },
                    body: {
                      connectorId: connector.id,
                      persist: false,
                      isStream: false,
                      messages: [
                        {
                          role: 'user',
                          content: `Here are the security alerts:\n\n${contextText}\n\nQuestion: ${question}`,
                        },
                      ],
                    },
                    retries: 0,
                  }),
                {
                  label: '[field-specific-lookup] Security AI Assistant chatComplete',
                  onRetry: ({ attempt, maxAttempts, delayMs, error }) => {
                    log.warning(
                      `[field-specific-lookup] API rate limited (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms. Error: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                  },
                }
              );

              const answer = response.data?.data ?? '';
              const answerPreview = `${answer.slice(0, 500)}${answer.length > 500 ? '...' : ''}`;
              log.info(
                `[field-specific-lookup] API response: status=${
                  response.data?.status ?? 'unknown'
                } answer="${answerPreview}"`
              );
              return { answer };
            } catch (err) {
              log.error(
                new Error(
                  `[field-specific-lookup] Security AI Assistant API call failed for question: "${question}"`,
                  { cause: err as Error }
                )
              );
              return { answer: '' };
            }
          },
        },
        evaluators
      );
    }
  );
});
