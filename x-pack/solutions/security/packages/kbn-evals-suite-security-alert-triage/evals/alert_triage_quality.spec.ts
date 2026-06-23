/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Quality eval: does the LLM produce a useful triage given real alert data?
 *
 * Three scenarios:
 *   1. Priority triage (inline mode, 100 alerts / 5 batches ≤ threshold):
 *      LLM sees all data directly; tests severity prioritisation.
 *   2. Entity correlation (inline mode, 100 alerts / 5 batches):
 *      Tests whether the LLM spots the host targeted by multiple alerts.
 *   3. End-to-end / summary mode (200 alerts / 10 batches > threshold):
 *      Uses both alert groups so attachment_read is required before
 *      the LLM can reason over the data. Covers the full shipped path:
 *      bulk selection → summary mode → attachment_read → triage real alerts.
 *
 * All scenarios include a grounding criterion that fails when the LLM
 * invents hosts or rule names not present in the attached alert data.
 *
 * Synthetic alerts are indexed into .alerts-security.alerts-default in
 * beforeAll and cleaned up in afterAll so no external snapshot is required.
 */

import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import {
  createSkillInvocationEvaluator,
  selectEvaluators,
  type DefaultEvaluators,
  type EvaluationDataset,
  type EvalsExecutorClient,
  type Example,
} from '@kbn/evals';
import type { Client as TraceEsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { evaluate as base } from '../src/evaluate';
import { callConverse } from '../src/converse_task';
import { attachmentReadCompliance } from '../src/evaluators';
import {
  ALL_TRIAGE_EVAL_ALERTS,
  ALL_TRIAGE_EVAL_IDS,
  ENTITY_CORRELATION_IDS,
  PRIORITY_TRIAGE_IDS,
} from '../src/synthetic_alerts';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALERTS_INDEX = '.alerts-security.alerts-default';
const ALERTS_BATCH_MAX_SIZE = 20;

const toAlertAttachments = (ids: string[]) => {
  const batches = [];
  for (let i = 0; i < ids.length; i += ALERTS_BATCH_MAX_SIZE) {
    batches.push({
      type: 'security.alerts',
      data: { alertIds: ids.slice(i, i + ALERTS_BATCH_MAX_SIZE) },
    });
  }
  return batches;
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TriageEvalExample extends Example {
  input: { question: string };
  output: { expected: string };
  metadata?: {
    attachments?: Array<{ type: string; data?: unknown }>;
    expectedAttachmentReads?: number;
  };
}

// ── Fixture factory ───────────────────────────────────────────────────────────

function createEvaluateTriageQuality({
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
  traceEsClient: TraceEsClient;
  log: ToolingLog;
}) {
  return async function evaluateTriageQuality({
    dataset,
    criteria,
  }: {
    dataset: { name: string; description: string; examples: TriageEvalExample[] };
    criteria: string[];
  }) {
    const selectedEvaluators = selectEvaluators([
      evaluators.criteria(criteria),
      attachmentReadCompliance,
      createSkillInvocationEvaluator({
        traceEsClient,
        log,
        skillName: 'alert-analysis',
      }),
      ...Object.values(evaluators.traceBasedEvaluators),
    ]);

    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: dataset.name,
            description: dataset.description,
            examples: dataset.examples,
          } satisfies EvaluationDataset,
        ],
        task: async ({ input, metadata }) => {
          const { attachments = [] } = metadata ?? {};
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

type EvaluateTriageQuality = ReturnType<typeof createEvaluateTriageQuality>;

const evaluate = base.extend<{ evaluateTriageQuality: EvaluateTriageQuality }, {}>({
  evaluateTriageQuality: [
    ({ fetch, connector, evaluators, executorClient, traceEsClient, log }, use) => {
      use(createEvaluateTriageQuality({ fetch, connector, evaluators, executorClient, traceEsClient, log }));
    },
    { scope: 'test' },
  ],
});

// ── Eval spec ─────────────────────────────────────────────────────────────────

evaluate.describe(
  'Security Alert Triage — output quality',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      log.info(
        `Indexing ${ALL_TRIAGE_EVAL_ALERTS.length} synthetic triage eval alerts into ${ALERTS_INDEX}`
      );

      const response = await esClient.bulk({
        refresh: 'wait_for',
        operations: ALL_TRIAGE_EVAL_ALERTS.flatMap(({ id, doc }) => [
          { index: { _index: ALERTS_INDEX, _id: id } },
          doc,
        ]),
      });

      if (response.errors) {
        const failed = response.items.filter((item) => item.index?.error);
        throw new Error(
          `Failed to set up triage eval alerts: ${JSON.stringify(
            failed.map((f) => f.index?.error)
          )}`
        );
      }

      log.info(`Successfully indexed ${ALL_TRIAGE_EVAL_ALERTS.length} synthetic alerts`);
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      const idsToDelete = ALL_TRIAGE_EVAL_ALERTS.map((alert) => alert.id);
      log.info(`Deleting ${idsToDelete.length} synthetic triage eval alerts`);

      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { ids: { values: idsToDelete } },
      });
    });

    evaluate(
      'Priority triage — structured output with severity prioritisation',
      async ({ evaluateTriageQuality }) => {
        await evaluateTriageQuality({
          dataset: {
            name: 'agent builder: security-alert-triage-priority',
            description:
              'Tests that the LLM prioritises critical and high severity alerts, mentions ' +
              'specific host names from the alert data, and provides actionable recommendations. ' +
              '5 alerts on distinct hosts with severities: critical, high, high, medium, medium.',
            examples: [
              {
                input: {
                  question:
                    'Triage these security alerts. Identify the most urgent issues, ' +
                    'note key entities (hosts, users), and recommend immediate actions.',
                },
                output: {
                  expected:
                    'The response should prioritise the critical Memory Injection via Process Hollowing alert on laptop-finance-07, ' +
                    'address the high-severity credential-dumping and lateral-movement alerts, ' +
                    'list the affected host names, and provide specific remediation steps for each.',
                },
                metadata: {
                  attachments: toAlertAttachments(PRIORITY_TRIAGE_IDS),
                },
              },
            ],
          },
          criteria: [
            'The response treats the critical severity alert as the highest priority item',
            'The response mentions specific host names present in the alert data',
            'The response includes concrete remediation steps, not just a description of the alerts',
            'The response distinguishes between urgent and lower-priority items',
            'The response does not reference any hostname, username, or rule name that is not present in the attached alert data',
          ],
        });
      }
    );

    evaluate(
      'Entity correlation — identifies a host targeted by multiple alerts',
      async ({ evaluateTriageQuality }) => {
        await evaluateTriageQuality({
          dataset: {
            name: 'agent builder: security-alert-triage-entity-correlation',
            description:
              'Tests that the LLM identifies the host appearing in 4 of 8 alerts (web-server-01) ' +
              'as a correlated or higher-risk target. The 4 web-server-01 alerts show a clear ' +
              'attack progression: SQL injection → web shell → reverse shell → privilege escalation.',
            examples: [
              {
                input: {
                  question:
                    'Review these security alerts. Are any hosts or users targeted ' +
                    'repeatedly? What does that pattern suggest about the threat?',
                },
                output: {
                  expected:
                    'The response identifies web-server-01 as the host appearing in multiple alerts ' +
                    'and flags the sequence of alerts as evidence of an active intrusion or attack ' +
                    'progression on that host, recommending immediate investigation or containment.',
                },
                metadata: {
                  attachments: toAlertAttachments(ENTITY_CORRELATION_IDS),
                },
              },
            ],
          },
          criteria: [
            'The response identifies that one specific host appears in multiple alerts',
            'The response names web-server-01 as the repeatedly targeted host',
            'The response treats the repeated targeting of a single host as a higher-risk indicator than the single-alert hosts',
            'The response does not reference any hostname, username, or rule name that is not present in the attached alert data',
          ],
        });
      }
    );

    evaluate(
      'End-to-end — summary mode with real alert data exercises attachment_read',
      async ({ evaluateTriageQuality }) => {
        // ALL_TRIAGE_EVAL_IDS = 200 alerts → 10 batches > inline threshold of 5
        // → framework switches to summary mode → LLM must call attachment_read
        //   to read each batch before it can reason over real alert content.
        // This is the only scenario that covers the full shipped path.
        const E2E_BATCH_COUNT = Math.ceil(ALL_TRIAGE_EVAL_IDS.length / ALERTS_BATCH_MAX_SIZE);
        await evaluateTriageQuality({
          dataset: {
            name: 'agent builder: security-alert-triage-e2e-summary-mode',
            description:
              `End-to-end coverage for the full bulk-add path: ${ALL_TRIAGE_EVAL_IDS.length} real ` +
              `alerts produce ${E2E_BATCH_COUNT} batches, triggering summary mode. The LLM must ` +
              'call attachment_read for each batch before reasoning. Combines both the priority-' +
              'triage group (1 critical alert buried at index 49) and the entity-correlation group ' +
              '(web-server-01 targeted by 20 alerts showing an attack progression).',
            examples: [
              {
                input: {
                  question:
                    'Review all these security alerts. Identify the most critical threats, ' +
                    'note any hosts or users that appear across multiple alerts, and recommend ' +
                    'prioritized actions.',
                },
                output: {
                  expected:
                    `The response calls attachment_read ${E2E_BATCH_COUNT} times to read each alert ` +
                    'batch, identifies the critical Memory Injection via Process Hollowing alert on ' +
                    'laptop-finance-07 as the highest priority, identifies web-server-01 as the most ' +
                    'frequently targeted host with an attack progression, and provides prioritized ' +
                    'remediation steps without referencing hosts or rules not in the data.',
                },
                metadata: {
                  attachments: toAlertAttachments(ALL_TRIAGE_EVAL_IDS),
                  expectedAttachmentReads: E2E_BATCH_COUNT,
                },
              },
            ],
          },
          criteria: [
            'The response treats the critical severity alert as the highest priority item',
            'The response names web-server-01 as a host that appears in multiple alerts',
            'The response provides prioritized remediation steps',
            'The response does not reference any hostname, username, or rule name that is not present in the attached alert data',
          ],
        });
      }
    );
  }
);
