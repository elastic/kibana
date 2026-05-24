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
  getToolCallSteps,
  selectEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import { attachmentTools, agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { evaluate as base } from '../src/evaluate';

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

interface AlertEvalExample {
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
  traceEsClient,
  log,
}: {
  fetch: HttpHandler;
  connector: { id: string };
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}) {
  return async function evaluateAlertBatches({
    dataset: { name, description, examples },
  }: {
    dataset: { name: string; description: string; examples: AlertEvalExample[] };
  }) {
    const task: ExperimentTask<AlertEvalExample, TaskOutput> = async ({ input, metadata }) => {
      log.info('Calling converse with alert batch attachments');

      const attachments = metadata?.attachments ?? [];

      const raw = (await fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentBuilderDefaultAgentId,
          connector_id: connector.id,
          input: input.question,
          attachments,
        }),
      })) as {
        conversation_id: string;
        trace_id?: string;
        steps: unknown[];
        response: { message: string };
      };

      return {
        errors: [],
        messages: [{ message: input.question }, raw.response],
        steps: raw.steps ?? [],
        traceId: raw.trace_id,
      };
    };

    const selectedEvaluators = selectEvaluators([
      {
        name: 'AttachmentReadCompliance',
        kind: 'CODE' as const,
        evaluate: async ({ output, metadata }) => {
          const expected =
            typeof metadata?.expectedAttachmentReads === 'number'
              ? metadata.expectedAttachmentReads
              : 0;

          if (!expected) {
            return { score: 1 };
          }

          const toolCalls = getToolCallSteps(output as TaskOutput);
          const readCalls = toolCalls.filter((t) => t.tool_id === attachmentTools.read);

          return {
            score: Math.min(1, readCalls.length / expected),
            metadata: { readCallCount: readCalls.length, expected },
          };
        },
      },
      ...Object.values(evaluators.traceBasedEvaluators),
    ]);

    await executorClient.runExperiment(
      { dataset: { name, description, examples }, task },
      selectedEvaluators
    );
  };
}

// ── Evaluate fixture extension ─────────────────────────────────────────────────

type EvaluateAlertBatches = ReturnType<typeof createEvaluateAlertBatches>;

const evaluate = base.extend<{ evaluateAlertBatches: EvaluateAlertBatches }, {}>({
  evaluateAlertBatches: [
    ({ fetch, connector, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateAlertBatches({
          fetch,
          connector,
          evaluators,
          executorClient,
          traceEsClient,
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
