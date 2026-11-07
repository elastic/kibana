/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Batch-reliability eval for the managed `system-security-alert-analysis` workflow.
 *
 * `alert_analysis_classification.spec.ts` classifies one alert per run. The Alert Triage Worker
 * sends up to 50 alerts of one rule per model call, which is where cheaper models tend to drop
 * verdicts, repeat ids or drift. Each example here seeds one deterministic batch (see
 * `batch_dataset.ts`: exact true/false-positive counts, one realistic rule, weighted sources, shuffled order), runs the
 * workflow once over the whole batch with the prompt, and grades every alert against its label.
 *
 * This is its own eval suite (`security-alert-analysis-workflow-batch`, run by
 * `batch.playwright.config.ts`), not part of the weekly Alert Analysis suite: a run takes tens of
 * minutes per model. On a PR, add the `evals:security-alert-analysis-workflow-batch` label.
 *
 * Evaluators: BatchCoverage, BatchAccuracy, HardShapeAccuracy, MaliciousNotClosed,
 * BenignNotEscalated, VerdictConsistency (see `batch_evaluators.ts`), plus WorkflowLatencySeconds and
 * ClassificationStepLatencySeconds (engine timestamps, `latency_evaluators.ts`).
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { selectEvaluators, type EvaluationDataset, type Example } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { runAlertAnalysisBatch } from '../src/workflow_task';
import { configureAlertAnalysisWorkflow, ensureAlertsIndex } from '../src/space_config';
import { buildBatchDocs, planBatch } from '../src/batch_dataset';
import { BATCH_RULES } from '../src/batch_rules';
import { batchEvaluators, type BatchExpected, type BatchOutput } from '../src/batch_evaluators';
import { latencyEvaluators } from '../src/latency_evaluators';
import { ALERTS_INDEX } from '../src/constants';

/** A typical sweep, one full model call (50), and two model calls (100), over both rules. */
const BATCHES = [
  { rule: 'powershell', size: 20 },
  { rule: 'persistence', size: 50 },
  { rule: 'powershell', size: 100 },
  // The same rules with the hard shapes mixed in.
  { rule: 'powershell', size: 50, hard: true },
  { rule: 'persistence', size: 100, hard: true },
];

const batchId = ({ rule, size, hard }: { rule: string; size: number; hard?: boolean }) =>
  `${rule}-${size}${hard ? '-hard' : ''}`;
const SEED = 1;

interface BatchExample extends Example {
  input: { rule: string; size: number; hard?: boolean };
  output: BatchExpected;
  metadata: { rule: string; size: number; hard?: boolean };
}

evaluate.describe(
  'Alert Analysis Workflow — batch reliability',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    const createdAlertIds = new Set<string>();

    evaluate.beforeAll(async ({ esClient }: { esClient: EsClient }) => {
      await ensureAlertsIndex(esClient);
    });

    evaluate.afterAll(async ({ esClient }: { esClient: EsClient }) => {
      if (createdAlertIds.size === 0) {
        return;
      }
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { ids: { values: [...createdAlertIds] } },
        refresh: true,
        conflicts: 'proceed',
      });
    });

    evaluate(
      'classifies a batch of alerts from one rule with the expected verdicts using a prompt',
      async ({ executorClient, esClient, fetch, log, connector }) => {
        await configureAlertAnalysisWorkflow({
          fetch,
          log,
          connectorId: connector.id,
          agentId: agentBuilderDefaultAgentId,
          usePrompt: true,
        });

        const examples: BatchExample[] = BATCHES.map((batch) => {
          const { rule, size, hard } = batch;
          const plan = planBatch({ rule: BATCH_RULES[rule], size, seed: SEED, hard });
          return {
            id: batchId(batch),
            input: batch,
            output: {
              labels: plan.map(({ expected }) => expected),
              shapes: plan.map(({ shape }) => shape),
              hard: plan.map((item) => item.hard),
            },
            metadata: batch,
          };
        });

        await executorClient.runExperiment(
          {
            metadata: { classificationMethod: 'prompt', seed: SEED },
            datasets: [
              {
                name: 'security: alert-analysis-workflow-batch (prompt)',
                description:
                  'Runs the managed alert-analysis workflow once over a whole batch of labeled ' +
                  `alerts from one rule (${BATCHES.map(batchId).join(
                    ', '
                  )}; 20% true positives) and ` +
                  'grades every alert, plus how many verdicts came back and whether alerts with ' +
                  'identical evidence got the same verdict.',
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async ({ metadata }): Promise<BatchOutput> => {
              const { rule, size, hard } = metadata as {
                rule: string;
                size: number;
                hard?: boolean;
              };
              const plan = planBatch({ rule: BATCH_RULES[rule], size, seed: SEED, hard });

              // Unique ids and rule per run, so concurrent batches never share alerts, rule-scoped
              // enrichment or entity-correlated related alerts.
              const runId = randomUUID();
              const docs = buildBatchDocs({
                ruleKey: rule,
                plan,
                runId,
                ruleId: `aa-batch-rule-${runId}`,
              });
              docs.forEach(({ id }) => createdAlertIds.add(id));

              const bulk = await esClient.bulk({
                operations: docs.flatMap(({ id, doc }) => [
                  { index: { _index: ALERTS_INDEX, _id: id } },
                  doc,
                ]),
                refresh: 'wait_for',
              });
              if (bulk.errors) {
                throw new Error(`Failed to index the batch of ${size} alerts`);
              }

              try {
                const { verdicts, executionStatus, traceId, timing } = await runAlertAnalysisBatch({
                  fetch,
                  log,
                  alertIds: docs.map(({ id }) => id),
                  alertIndex: ALERTS_INDEX,
                });
                return {
                  predictions: docs.map(({ id }) => ({
                    classification: verdicts[id]?.classification,
                  })),
                  executionStatus,
                  traceId,
                  timing,
                };
              } finally {
                await esClient
                  .deleteByQuery({
                    index: ALERTS_INDEX,
                    query: { ids: { values: docs.map(({ id }) => id) } },
                    refresh: true,
                    conflicts: 'proceed',
                  })
                  .then(() => docs.forEach(({ id }) => createdAlertIds.delete(id)))
                  .catch(() => {
                    // Left in createdAlertIds so afterAll sweeps them.
                  });
              }
            },
          },
          selectEvaluators([...batchEvaluators, ...latencyEvaluators])
        );
      }
    );
  }
);
