/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrectnessAnalysis, GroundednessAnalysis } from '@kbn/evals';
import { tags, withEvaluatorSpan, withRetry } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { filterByCategory } from '../src/datasets';
import type { AlertsRagTaskOutput } from '../src/evaluate_dataset';
import {
  buildAlertContextText,
  buildAlertsRagEvaluators,
  toDatasetExample,
} from '../src/evaluate_dataset';

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

const resolveK = (): number => {
  const raw = process.env.ALERTS_RAG_EVAL_K;
  if (!raw) return 10;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
};

const emptyTaskOutput: AlertsRagTaskOutput = {
  answer: '',
  messages: [],
  steps: [],
  correctnessAnalysis: null,
  groundednessAnalysis: null,
};

evaluate.describe('Alerts RAG – Field-Specific Lookups', { tag: tags.stateful.classic }, () => {
  const examples = filterByCategory('field_specific_lookup');

  evaluate(
    `field-specific lookups (${examples.length} examples) via Security AI Assistant API`,
    async ({ kbnClient, connector, evaluators, executorClient, log }) => {
      const wrappedExamples = examples.map(toDatasetExample);
      const evalStack = buildAlertsRagEvaluators({ k: resolveK() });

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
              return emptyTaskOutput;
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

            let answer = '';
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
              answer = response.data?.data ?? '';
              const answerPreview = `${answer.slice(0, 500)}${answer.length > 500 ? '...' : ''}`;
              log.info(
                `[field-specific-lookup] API response: status=${
                  response.data?.status ?? 'unknown'
                } answer="${answerPreview}"`
              );
            } catch (err) {
              log.error(
                new Error(
                  `[field-specific-lookup] Security AI Assistant API call failed for question: "${question}"`,
                  { cause: err as Error }
                )
              );
              return emptyTaskOutput;
            }

            // Shape required by the framework's analysis evaluators (mirrors
            // the pattern in `createEvaluateAlertsRagDataset`): `messages`
            // last entry is the answer text the judge reads, `steps` is the
            // tool-call trace which is empty for this single-turn API call.
            const taskOutput = {
              messages: [{ message: answer }],
              steps: [] as unknown[],
            };

            const [correctnessResult, groundednessResult] = await Promise.all([
              withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
                evaluators.correctnessAnalysis().evaluate({
                  input,
                  expected: example.output,
                  output: taskOutput,
                  metadata: example.metadata,
                })
              ),
              withEvaluatorSpan('GroundednessAnalysis', {}, () =>
                evaluators.groundednessAnalysis().evaluate({
                  input,
                  expected: example.output,
                  output: taskOutput,
                  metadata: example.metadata,
                })
              ),
            ]);

            return {
              answer,
              messages: taskOutput.messages,
              steps: taskOutput.steps,
              correctnessAnalysis:
                (correctnessResult?.metadata as CorrectnessAnalysis | undefined) ?? null,
              groundednessAnalysis:
                (groundednessResult?.metadata as GroundednessAnalysis | undefined) ?? null,
            };
          },
        },
        evalStack
      );
    }
  );
});
