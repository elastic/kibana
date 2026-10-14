/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Multi-alert batch eval for the managed `system-security-alert-analysis` workflow.
 *
 * `alert_analysis_classification.spec.ts` seeds ONE alert per run, so the classification step's raw
 * `verdicts` array has length 1 in every example. This spec seeds whole batches (50 alerts = exactly
 * `consts.batch_size`, 10 alerts, a near-duplicate pair, and three alerts whose ids differ by one or
 * two hex characters) and grades the RAW verdict array: count, duplicate ids, foreign ids, coverage,
 * verdict↔alert correspondence, and per-alert accuracy. See `src/batch_alerts.ts` for the fixtures
 * and `src/batch_verdicts.ts` for the predicates.
 *
 * Evaluators (all CODE, deterministic, each reported under its own name):
 *   - BatchVerdictIntegrity: count == alerts, ids ⊆ batch, no repeats, every alert answered.
 *   - BatchVerdictCoverage: fraction of batch alerts that received a verdict.
 *   - BatchVerdictCorrespondence: no verdict names another batch alert's evidence under its own id.
 *   - BatchClassificationAccuracy: fraction of batch alerts whose paired verdict has the golden label.
 *   - trajectory (agent only): zero-tool guardrail, as in the single-alert spec.
 *
 * Experiment names carry the `alertzero-` prefix so these results are identifiable in the golden
 * index; the agent and prompt paths get distinct names. The single-alert spec's names are unchanged.
 */

import { randomBytes } from 'crypto';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { selectEvaluators, type EvaluationDataset, type Example } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { runAlertAnalysisBatchWorkflow, type ClassificationMethod } from '../src/workflow_task';
import { configureAlertAnalysisWorkflow } from '../src/space_config';
import { BATCH_EVALUATORS, createAlertAnalysisTrajectoryEvaluator } from '../src/evaluators';
import type { BatchTaskOutput } from '../src/evaluators';
import { ALERT_ANALYSIS_EVAL_BATCHES, buildBatchAlerts } from '../src/batch_alerts';
import { ALERTS_INDEX } from '../src/constants';

const BATCH_BY_ID = new Map(ALERT_ANALYSIS_EVAL_BATCHES.map((batch) => [batch.id, batch]));

interface AlertAnalysisBatchExample extends Example {
  input: { batchId: string };
  output: { alertCount: number };
  metadata: { batchId: string; alertIndex: string; alertCount: number; description: string };
}

evaluate.describe(
  'Alert Analysis Workflow — multi-alert batches',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    const createdAlertIds = new Set<string>();

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      if (createdAlertIds.size === 0) {
        return;
      }
      log.info(`Deleting ${createdAlertIds.size} leftover alert-analysis batch eval alerts`);
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { ids: { values: [...createdAlertIds] } },
        refresh: true,
        conflicts: 'proceed',
      });
    });

    const METHODS: Array<{
      method: ClassificationMethod;
      title: string;
      datasetName: string;
      experimentName: string;
    }> = [
      {
        method: 'agent',
        title: 'returns exactly one intact verdict per alert for multi-alert batches',
        datasetName: 'security: alert-analysis-workflow-batches',
        experimentName: 'alertzero-alert-analysis-workflow-batches',
      },
      {
        method: 'prompt',
        title:
          'returns exactly one intact verdict per alert for multi-alert batches using a prompt',
        datasetName: 'security: alert-analysis-workflow-batches (prompt)',
        experimentName: 'alertzero-alert-analysis-workflow-batches-prompt',
      },
    ];

    // One test per method, run one after the other: both write the same space setting.
    METHODS.forEach(({ method, title, datasetName, experimentName }) => {
      evaluate(title, async ({ executorClient, esClient, fetch, log, connector }) => {
        await configureAlertAnalysisWorkflow({
          fetch,
          log,
          connectorId: connector.id,
          agentId: agentBuilderDefaultAgentId,
          usePrompt: method === 'prompt',
        });

        const examples: AlertAnalysisBatchExample[] = ALERT_ANALYSIS_EVAL_BATCHES.map((batch) => ({
          id: batch.id,
          input: { batchId: batch.id },
          output: { alertCount: batch.alerts.length },
          metadata: {
            batchId: batch.id,
            alertIndex: ALERTS_INDEX,
            alertCount: batch.alerts.length,
            description: batch.description,
          },
        }));

        const trajectory = method === 'agent' ? [createAlertAnalysisTrajectoryEvaluator()] : [];
        log.info(
          `Scoring ${examples.length} batches (${ALERT_ANALYSIS_EVAL_BATCHES.map(
            (batch) => `${batch.id}:${batch.alerts.length}`
          ).join(', ')}) via ${method}`
        );

        await executorClient.runExperiment(
          {
            name: experimentName,
            metadata: { classificationMethod: method },
            datasets: [
              {
                name: datasetName,
                description:
                  'Seeds multi-alert batches of ONE rule execution (50 alerts = batch_size, 10 ' +
                  'alerts, a near-duplicate pair, and ids differing by 1-2 hex characters), runs ' +
                  'the managed workflow end-to-end, and grades the raw verdict array the ' +
                  `${method === 'agent' ? 'ai.agent' : 'ai.prompt'} step returned.`,
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async ({ metadata }): Promise<BatchTaskOutput> => {
              const { batchId, alertIndex } = metadata as {
                batchId: string;
                alertIndex: string;
              };
              const batch = BATCH_BY_ID.get(batchId);
              if (!batch) {
                throw new Error(`No synthetic alert batch found for id ${batchId}`);
              }

              // A fresh tag per run keeps every alert id and the shared rule uuid unique, so a
              // repetition never trips the workflow's `already_analyzed` gate and concurrent
              // repetitions never share rule-scoped enrichment. The tag is hex so the id-collision
              // batch keeps ids that differ by hex characters only.
              const runTag = randomBytes(4).toString('hex');
              const alerts = buildBatchAlerts(batch, runTag);
              alerts.forEach((alert) => createdAlertIds.add(alert.id));

              const bulk = await esClient.bulk({
                refresh: 'wait_for',
                operations: alerts.flatMap((alert) => [
                  { index: { _index: alertIndex, _id: alert.id } },
                  alert.doc,
                ]),
              });
              if (bulk.errors) {
                const failed = bulk.items.filter((item) => item.index?.error);
                throw new Error(
                  `Seeding batch ${batchId} failed for ${failed.length}/${
                    alerts.length
                  } alerts: ${JSON.stringify(failed[0]?.index?.error)}`
                );
              }

              try {
                const result = await runAlertAnalysisBatchWorkflow({
                  fetch,
                  log,
                  alertIds: alerts.map((alert) => alert.id),
                  alertIndex,
                  classificationMethod: method,
                });
                log.info(
                  `Batch ${batchId} (${alerts.length} alerts): raw verdicts=${result.rawVerdicts.length} status=${result.executionStatus}`
                );
                return {
                  alerts: alerts.map(({ id, expected, markers }) => ({ id, expected, markers })),
                  rawVerdicts: result.rawVerdicts,
                  executionId: result.executionId,
                  executionStatus: result.executionStatus,
                  classificationMethod: method,
                };
              } finally {
                await esClient
                  .deleteByQuery({
                    index: alertIndex,
                    query: { ids: { values: alerts.map((alert) => alert.id) } },
                    refresh: true,
                    conflicts: 'proceed',
                  })
                  .then(() => alerts.forEach((alert) => createdAlertIds.delete(alert.id)))
                  .catch(() => {
                    // Leave them in createdAlertIds so afterAll sweeps them.
                  });
              }
            },
          },
          selectEvaluators([...BATCH_EVALUATORS, ...trajectory])
        );
      });
    });
  }
);
