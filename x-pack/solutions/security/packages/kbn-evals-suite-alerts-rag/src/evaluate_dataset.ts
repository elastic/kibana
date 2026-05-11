/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type {
  CorrectnessAnalysis,
  DefaultEvaluators,
  EvalsExecutorClient,
  EvaluationDataset,
  Evaluator,
  Example,
  GroundednessAnalysis,
  GroundTruth,
} from '@kbn/evals';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  createRagEvaluators,
  withEvaluatorSpan,
  withRetry,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AlertDocument, AlertsRagCategory, AlertsRagExample } from './dataset';

/**
 * Synthetic index label used for RAG evaluators (Precision@K / Recall@K / F1@K).
 * Alert IDs from the eval fixture dataset are bucketed under this label so that
 * extractRetrievedDocs and extractGroundTruth resolve to the same namespace.
 */
export const EVAL_ALERTS_INDEX = 'eval.alerts';

/**
 * Wrapped input type for the kbn-evals framework.
 * Must extend Record<string, unknown> to satisfy the Example<TInput> constraint.
 */
export interface AlertsRagDatasetInput extends Record<string, unknown> {
  question: string;
  context: AlertDocument[];
}

/**
 * Dataset-level expected output. `reference` is consumed by the RAG retrieval
 * extractor (alert-ID ground truth); `expected` is the field the framework's
 * `correctnessAnalysis` evaluator reads from `expected.expected`. We persist
 * both so a single dataset row drives both the RAG and correctness pipelines.
 */
export interface AlertsRagDatasetExpected {
  reference: string;
  expected: string;
}

/**
 * Dataset-level metadata forwarded from AlertsRagExample.
 * Must extend Record<string, unknown> to satisfy the Example<..., TMetadata> constraint.
 */
export interface AlertsRagDatasetMetadata extends Record<string, unknown> {
  category: AlertsRagCategory;
  dataset_split: string[];
  langsmithExampleId?: string;
}

export type AlertsRagDatasetExample = Example<
  AlertsRagDatasetInput,
  AlertsRagDatasetExpected,
  AlertsRagDatasetMetadata
>;

/**
 * Task output shape the framework's quantitative evaluators consume.
 *
 * - `messages`: the agent's chat history (last message is the answer text the
 *   framework's `correctnessAnalysis` / `groundednessAnalysis` evaluators read).
 * - `correctnessAnalysis` / `groundednessAnalysis`: precomputed in the task via
 *   `evaluators.correctnessAnalysis()` / `evaluators.groundednessAnalysis()` so
 *   the deterministic Factuality / Relevance / Sequence Accuracy / Groundedness
 *   evaluators can score without re-invoking the judge model.
 * - `answer`: kept as a convenience for in-suite logging only. Not read by the
 *   framework evaluators.
 */
export interface AlertsRagTaskOutput {
  answer: string;
  messages: Array<{ message: string }>;
  steps: unknown[];
  correctnessAnalysis: CorrectnessAnalysis | null;
  groundednessAnalysis: GroundednessAnalysis | null;
}

export type EvaluateAlertsRagDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: AlertsRagExample[];
  };
}) => Promise<void>;

const resolveK = (): number => {
  const raw = process.env.ALERTS_RAG_EVAL_K;
  if (!raw) return 10;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10;
};

const extractAlertIds = (text: string | undefined): string[] => {
  if (!text) return [];
  return [...new Set(text.match(/rag-alert-\d+/g) ?? [])];
};

export const buildAlertContextText = (context: AlertDocument[]): string =>
  context
    .map((doc) => {
      const src = doc._source;
      return [
        `Alert ID: ${doc._id}`,
        `Timestamp: ${src['@timestamp']}`,
        ...(src.host ? [`Host: ${src.host.name}`] : []),
        ...(src.user ? [`User: ${src.user.name}`] : []),
        `Rule: ${src.kibana.alert.rule.name}`,
        `Severity: ${src.kibana.alert.severity}`,
        `Status: ${src.kibana.alert.status}`,
      ].join('\n');
    })
    .join('\n\n');

export const toDatasetExample = (ex: AlertsRagExample): AlertsRagDatasetExample => ({
  input: { question: ex.input, context: ex.context ?? [] },
  output: { reference: ex.expected.reference, expected: ex.expected.reference },
  metadata: {
    category: ex.metadata.category,
    dataset_split: ex.metadata.dataset_split,
    langsmithExampleId: ex.langsmithExampleId,
  },
});

/**
 * Build the eval stack expected by `createQuantitativeCorrectnessEvaluators`
 * and `createQuantitativeGroundednessEvaluator`: both read precomputed
 * analyses from the task output. The RAG evaluators (Precision@K / Recall@K /
 * F1@K) live alongside since alert-ID retrieval is the load-bearing signal
 * for this suite.
 *
 * Kept as a top-level export so `src/evaluate_dataset.test.ts` can pin the
 * evaluator set against accidental drift.
 */
export const buildAlertsRagEvaluators = ({
  k,
}: {
  k: number;
}): Array<Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput>> => {
  const ragEvaluators = createRagEvaluators<AlertsRagTaskOutput, AlertsRagDatasetExpected>({
    k,
    extractRetrievedDocs: (output) =>
      extractAlertIds(output?.answer).map((id) => ({ index: EVAL_ALERTS_INDEX, id })),
    extractGroundTruth: (expected): GroundTruth => {
      const ids = extractAlertIds(expected?.reference);
      if (ids.length === 0) return {};
      return { [EVAL_ALERTS_INDEX]: Object.fromEntries(ids.map((id) => [id, 1])) };
    },
  }) as Array<Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput>>;

  return [
    ...ragEvaluators,
    ...(createQuantitativeCorrectnessEvaluators() as Array<
      Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput>
    >),
    createQuantitativeGroundednessEvaluator() as Evaluator<
      AlertsRagDatasetExample,
      AlertsRagTaskOutput
    >,
  ];
};

export const createEvaluateAlertsRagDataset = ({
  executorClient,
  evaluators,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  evaluators: DefaultEvaluators;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateAlertsRagDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<AlertsRagDatasetExample>;

    const k = resolveK();
    const evalStack = buildAlertsRagEvaluators({ k });

    await executorClient.runExperiment(
      {
        dataset,
        task: async (example): Promise<AlertsRagTaskOutput> => {
          const input = example.input;
          if (!input) {
            return {
              answer: '',
              messages: [],
              steps: [],
              correctnessAnalysis: null,
              groundednessAnalysis: null,
            };
          }
          const { question, context } = input;
          const questionPreview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
          log.info(
            `[alerts-rag] task request: question="${questionPreview}" context=${context.length} alert(s)`
          );
          const contextText = buildAlertContextText(context);
          log.debug(
            `[alerts-rag] task request body:\nSystem: You are a security analyst...\nUser: Security alerts:\n${contextText}\n\nQuestion: ${question}`
          );
          const response = await withRetry(
            () =>
              inferenceClient.chatComplete({
                system:
                  'You are a security analyst. Answer questions about the provided security alerts accurately and concisely. Reference specific alert IDs when relevant.',
                messages: [
                  {
                    role: MessageRole.User,
                    content: `Security alerts:\n\n${contextText}\n\nQuestion: ${question}`,
                  },
                ],
              }),
            {
              label: 'AlertsRAG task chatComplete',
              onRetry: ({ attempt, maxAttempts, delayMs, error }) => {
                log.warning(
                  `AlertsRAG task: chatComplete rate limited (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms. Error: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              },
            }
          );
          const answerPreview = `${response.content.slice(0, 500)}${
            response.content.length > 500 ? '...' : ''
          }`;
          log.info(`[alerts-rag] task response: answer="${answerPreview}"`);

          // Shape required by the framework's analysis evaluators: they
          // read `output.messages[length-1].message` for the answer text
          // and `output.steps` for any tool-call trace. This suite uses a
          // single-turn chatComplete (no tools), so `steps` is empty.
          const taskOutput = {
            messages: [{ message: response.content }],
            steps: [] as unknown[],
          };

          // Precompute the qualitative analyses inside the task. Each is
          // wrapped in its own evaluator span and runs in parallel so the
          // judge-LLM cost is paid once per example, and the deterministic
          // Factuality / Relevance / Sequence Accuracy / Groundedness
          // evaluators downstream are pure functions of the precomputed
          // analysis. Mirrors the pattern in
          // `x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/src/evaluate_dataset.ts`.
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
            answer: response.content,
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
  };
};
