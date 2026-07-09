/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic eval: attachment_read compliance for bulk alert batches.
 *
 * When >5 attachments are present the framework switches to summary mode, showing
 * only metadata and instructing the LLM to call `attachment_read(attachment_id)`
 * per batch before answering. This eval verifies the LLM follows that instruction.
 *
 * No real alert data is required. Synthetic IDs trigger summary mode and the
 * format() function returns "not found" for each — enough for the LLM to see
 * the attachment_read prompt and act on it.
 */

import { tags } from '@kbn/scout';
import {
  selectEvaluators,
  type DefaultEvaluators,
  type EvaluationDataset,
  type EvalsExecutorClient,
  type Example,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { evaluate as base } from '../src/evaluate';
import { callConverse } from '../src/converse_task';
import { attachmentReadCompliance } from '../src/evaluators';

// ── Dataset constants ──────────────────────────────────────────────────────────

const BATCH_SIZE = 20;
// 6 batches > framework inline threshold of 5 → summary mode
const BATCH_COUNT = 6;

const alertBatches: Array<{ alertIds: string[] }> = Array.from(
  { length: BATCH_COUNT },
  (_, batchIndex) => ({
    alertIds: Array.from(
      { length: BATCH_SIZE },
      (__, alertIndex) =>
        `eval-alert-b${batchIndex.toString().padStart(2, '0')}-${alertIndex
          .toString()
          .padStart(2, '0')}`
    ),
  })
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface AlertEvalExample extends Example {
  input: { question: string };
  output: { expected: string };
  metadata?: {
    attachments?: Array<{ type: string; data?: unknown }>;
    expectedAttachmentReads?: number;
  };
}

// ── Fixture factory ────────────────────────────────────────────────────────────

function createEvaluateAlertBatches({
  fetch,
  connector,
  evaluators,
  executorClient,
  log,
}: {
  fetch: HttpHandler;
  connector: { id: string };
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
}) {
  return async function evaluateAlertBatches({
    dataset: { name, description, examples },
  }: {
    dataset: { name: string; description: string; examples: AlertEvalExample[] };
  }) {
    const selectedEvaluators = selectEvaluators([
      attachmentReadCompliance,
      ...Object.values(evaluators.traceBasedEvaluators),
    ]);

    await executorClient.runExperiment(
      {
        datasets: [{ name, description, examples } satisfies EvaluationDataset],
        task: async ({ input, metadata }) => {
          const attachments = metadata?.attachments ?? [];
          return callConverse({
            fetch,
            connectorId: connector.id,
            question: input.question,
            attachments,
            log,
          });
        },
      },
      selectedEvaluators
    );
  };
}

// ── Evaluate fixture extension ─────────────────────────────────────────────────

type EvaluateAlertBatches = ReturnType<typeof createEvaluateAlertBatches>;

const evaluate = base.extend<{ evaluateAlertBatches: EvaluateAlertBatches }, {}>({
  evaluateAlertBatches: [
    ({ fetch, connector, evaluators, executorClient, log }, use) => {
      use(
        createEvaluateAlertBatches({
          fetch,
          connector,
          evaluators,
          executorClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

// ── Eval spec ─────────────────────────────────────────────────────────────────

evaluate.describe(
  'Security Alerts — attachment_read compliance',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      `LLM calls attachment_read for all ${BATCH_COUNT} batches when in summary mode`,
      async ({ evaluateAlertBatches }) => {
        await evaluateAlertBatches({
          dataset: {
            name: 'agent builder: security-bulk-alerts-attachment-read',
            description:
              `Validates the LLM calls attachment_read for each of ${BATCH_COUNT} alert batches ` +
              'when the framework is in summary mode (>5 active attachments). ' +
              'Synthetic alert IDs are used — format() returns "not found" per ID, which is ' +
              'sufficient to populate the attachment and trigger summary mode. ' +
              'Score = attachment_read call count / expected batch count.',
            examples: [
              {
                input: {
                  question:
                    'I have added security alerts for your review. Please triage them — ' +
                    'identify patterns, shared entities, and escalation indicators, then recommend actions.',
                },
                output: {
                  expected:
                    `I will call attachment_read ${BATCH_COUNT} times to read each alert batch, ` +
                    'then synthesize patterns, identify shared entities, and recommend triage actions.',
                },
                metadata: {
                  attachments: alertBatches.map(({ alertIds }) => ({
                    type: 'security.alerts',
                    data: { alertIds },
                  })),
                  expectedAttachmentReads: BATCH_COUNT,
                },
              },
            ],
          },
        });
      }
    );
  }
);
