/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type {
  EvalsExecutorClient,
  EvaluationDataset,
  Evaluator,
  Example,
  GroundTruth,
} from '@kbn/evals';
import { createRagEvaluators } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AlertDocument, AlertsRagCategory, AlertsRagExample } from './dataset';
import { createAlertsFaithfulnessEvaluator } from './evaluators/alerts_rag_faithfulness_evaluator';
import { createAlertsCorrectnessEvaluator } from './evaluators/alerts_rag_correctness_evaluator';

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

export interface AlertsRagDatasetExpected {
  reference: string;
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

export interface AlertsRagTaskOutput {
  answer: string;
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

const buildAlertContextText = (context: AlertDocument[]): string =>
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

const toDatasetExample = (ex: AlertsRagExample): AlertsRagDatasetExample => ({
  input: { question: ex.input, context: ex.context ?? [] },
  output: ex.expected,
  metadata: {
    category: ex.metadata.category,
    dataset_split: ex.metadata.dataset_split,
    langsmithExampleId: ex.langsmithExampleId,
  },
});

export const createEvaluateAlertsRagDataset = ({
  executorClient,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
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

    const evaluators: Array<Evaluator<AlertsRagDatasetExample, AlertsRagTaskOutput>> = [
      ...ragEvaluators,
      createAlertsFaithfulnessEvaluator({ inferenceClient, log }),
      createAlertsCorrectnessEvaluator({ inferenceClient, log }),
    ];

    await executorClient.runExperiment(
      {
        dataset,
        task: async (example): Promise<AlertsRagTaskOutput> => {
          const input = example.input;
          if (!input) {
            return { answer: '' };
          }
          const { question, context } = input;
          log.debug(`Alerts RAG task: "${question}" with ${context.length} alert documents`);
          const contextText = buildAlertContextText(context);
          const response = await inferenceClient.chatComplete({
            system:
              'You are a security analyst. Answer questions about the provided security alerts accurately and concisely. Reference specific alert IDs when relevant.',
            messages: [
              {
                role: MessageRole.User,
                content: `Security alerts:\n\n${contextText}\n\nQuestion: ${question}`,
              },
            ],
          });
          return { answer: response.content };
        },
      },
      evaluators
    );
  };
};
