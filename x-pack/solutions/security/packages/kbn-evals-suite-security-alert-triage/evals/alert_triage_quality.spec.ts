/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Quality eval: does the LLM produce a useful triage given real alert data?
 *
 * Two scenarios run in inline mode (1 batch each → ≤5 attachments → LLM sees
 * all data directly without needing attachment_read). This isolates output
 * quality from the attachment-read compliance already covered by
 * bulk_alerts_attachment_read.spec.ts.
 *
 * Synthetic alerts are indexed into .alerts-security.alerts-default in
 * beforeAll and cleaned up in afterAll so no external snapshot is required.
 */

import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import {
  selectEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { evaluate as base } from '../src/evaluate';
import {
  ALL_TRIAGE_EVAL_ALERTS,
  ENTITY_CORRELATION_IDS,
  PRIORITY_TRIAGE_IDS,
} from '../src/synthetic_alerts';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALERTS_INDEX = '.alerts-security.alerts-default';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TriageEvalExample {
  input: { question: string };
  output: { expected: string };
  metadata?: {
    attachments?: Array<{ type: string; data?: unknown }>;
  };
}

// ── Fixture factory ───────────────────────────────────────────────────────────

function createEvaluateTriageQuality({
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
  return async function evaluateTriageQuality({
    dataset,
    criteria,
  }: {
    dataset: { name: string; description: string; examples: TriageEvalExample[] };
    criteria: string[];
  }) {
    const task: ExperimentTask<TriageEvalExample, TaskOutput> = async ({ input, metadata }) => {
      log.info(`Running triage eval task: "${input.question.slice(0, 80)}..."`);

      const { attachments = [] } = metadata ?? {};

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
      evaluators.criteria(criteria),
      ...Object.values(evaluators.traceBasedEvaluators),
    ]);

    await executorClient.runExperiment(
      {
        dataset: {
          name: dataset.name,
          description: dataset.description,
          examples: dataset.examples,
        },
        task,
      },
      selectedEvaluators
    );
  };
}

// ── Evaluate fixture extension ─────────────────────────────────────────────────

type EvaluateTriageQuality = ReturnType<typeof createEvaluateTriageQuality>;

const evaluate = base.extend<{ evaluateTriageQuality: EvaluateTriageQuality }, {}>({
  evaluateTriageQuality: [
    ({ fetch, connector, evaluators, executorClient, log }, use) => {
      use(createEvaluateTriageQuality({ fetch, connector, evaluators, executorClient, log }));
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
                    'The response should prioritise the critical PowerShell alert on workstation-42, ' +
                    'address the high-severity credential-dumping and network-scanning alerts, ' +
                    'list the affected host names, and provide specific remediation steps for each.',
                },
                metadata: {
                  attachments: [
                    { type: 'security.alerts', data: { alertIds: PRIORITY_TRIAGE_IDS } },
                  ],
                },
              },
            ],
          },
          criteria: [
            'The response treats the critical severity alert as the highest priority item',
            'The response mentions specific host names present in the alert data',
            'The response includes concrete remediation steps, not just a description of the alerts',
            'The response distinguishes between urgent and lower-priority items',
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
                  attachments: [
                    { type: 'security.alerts', data: { alertIds: ENTITY_CORRELATION_IDS } },
                  ],
                },
              },
            ],
          },
          criteria: [
            'The response identifies that one specific host appears in multiple alerts',
            'The response names web-server-01 as the repeatedly targeted host',
            'The response treats the repeated targeting of a single host as a higher-risk indicator than the single-alert hosts',
          ],
        });
      }
    );
  }
);
