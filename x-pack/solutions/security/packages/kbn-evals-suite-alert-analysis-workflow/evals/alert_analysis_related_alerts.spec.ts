/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Related-alert sensitivity eval for the managed `system-security-alert-analysis` workflow.
 *
 * Asks whether the verdict on a target alert depends on the rule names of the related alerts the
 * workflow attaches to it. Each case seeds one target plus its related alerts and grades the
 * target's verdict only. Case design, correlation and CCS scope: `src/related_alert_cases.ts`.
 *
 * Kept separate from the weekly single-alert and batch suites so their trends stay comparable.
 * Both evaluators are CODE evaluators, so no LLM judge runs here.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { selectEvaluators, type EvaluationDataset, type Example } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { runAlertAnalysisWorkflow } from '../src/workflow_task';
import { configureAlertAnalysisWorkflow, ensureAlertsIndex } from '../src/space_config';
import { classificationAccuracy, validVerdict } from '../src/evaluators';
import { ALERTS_INDEX } from '../src/constants';
import { RELATED_ALERT_CASES, buildRelatedAlertDoc } from '../src/related_alert_cases';

interface RelatedAlertExample extends Example {
  input: { caseId: string };
  output: { classification: string };
  metadata: { caseId: string; expected: string; description: string };
}

evaluate.describe(
  'Alert Analysis Workflow — related-alert sensitivity',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    const createdAlertIds = new Set<string>();

    evaluate.beforeAll(async ({ esClient }: { esClient: EsClient }) => {
      await ensureAlertsIndex(esClient);
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      if (createdAlertIds.size === 0) {
        return;
      }
      log.info(`Deleting ${createdAlertIds.size} leftover related-alert eval alerts`);
      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { ids: { values: [...createdAlertIds] } },
        refresh: true,
        conflicts: 'proceed',
      });
    });

    evaluate(
      'keeps the target verdict when related alerts carry scary rule names',
      async ({ executorClient, esClient, fetch, log, traceEsClient, connector }) => {
        await configureAlertAnalysisWorkflow({
          fetch,
          log,
          connectorId: connector.id,
          agentId: agentBuilderDefaultAgentId,
          usePrompt: true,
        });

        const examples: RelatedAlertExample[] = RELATED_ALERT_CASES.map((testCase) => ({
          id: testCase.id,
          input: { caseId: testCase.id },
          output: { classification: testCase.expected },
          metadata: {
            caseId: testCase.id,
            expected: testCase.expected,
            description: testCase.description,
          },
        }));

        await executorClient.runExperiment(
          {
            metadata: { classificationMethod: 'prompt' },
            datasets: [
              {
                name: 'security: alert-analysis-workflow-related-alerts (prompt)',
                description:
                  'Runs the managed alert-analysis workflow on a target alert whose host and user ' +
                  'are shared with related alerts (scary rule names, benign or malicious command ' +
                  'lines, one injected instruction), and grades the target verdict against its label.',
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async ({ metadata }) => {
              const { caseId } = metadata as { caseId: string };
              const testCase = RELATED_ALERT_CASES.find(({ id }) => id === caseId);
              if (!testCase) {
                throw new Error(`No related-alert case ${caseId}`);
              }

              // A per-run suffix on every alert id and on the shared host id, so concurrent runs
              // correlate only within themselves.
              const runId = randomUUID();
              const targetId = `${caseId}-target-${runId}`;
              const fixtures = [testCase.target, ...testCase.related];
              const docs = fixtures.map((fixture, index) => {
                const id = index === 0 ? targetId : `${caseId}-rel-${index}-${runId}`;
                return { id, doc: buildRelatedAlertDoc(fixture, id, index, runId) };
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
                throw new Error(`Failed to index related-alert case ${caseId}`);
              }

              try {
                return await runAlertAnalysisWorkflow({
                  fetch,
                  log,
                  traceEsClient,
                  alertId: targetId,
                  alertIndex: ALERTS_INDEX,
                  classificationMethod: 'prompt',
                });
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
                    // Left in createdAlertIds so afterAll sweeps it.
                  });
              }
            },
          },
          selectEvaluators([classificationAccuracy, validVerdict])
        );
      }
    );
  }
);
