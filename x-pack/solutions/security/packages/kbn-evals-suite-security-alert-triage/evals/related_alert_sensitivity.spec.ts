/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Related-alert sensitivity eval for the alert-analysis skill, run through /converse on the
 * default agent (natural skill routing, no forced skill or agent ids). Each case indexes a target
 * alert plus its related alerts, attaches the target as a `security.alerts` attachment and grades
 * the final `Verdict:` line. Cases and documents come from the workflow-path suite, so both paths
 * are scored against the same labels, minus cases the name-based tool cannot correlate.
 *
 * Host and user names carry per-run suffixes (6 hex / 6 decimal digits), so leftovers from a
 * failed cleanup collide with a later run with probability ~1e-6 per pair of runs; examples
 * still run one at a time as extra safety.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { selectEvaluators, type EvaluationDataset, type Example } from '@kbn/evals';
import {
  ALERTS_INDEX,
  CLASSIFICATIONS,
  ensureAlertsIndex,
} from '@kbn/evals-suite-alert-analysis-workflow';
import { evaluate } from '../src/evaluate';
import { callConverse } from '../src/converse_task';
import { TRIAGE_RELATED_ALERT_CASES, buildCaseDocs } from '../src/related_alert_docs';
import {
  relatedAlertsRetrieved,
  verdictAccuracy,
  verdictAccuracyWithRelated,
  verdictParsed,
} from '../src/related_alert_evaluators';

const VERDICT_QUESTION =
  'Triage the attached alert and decide whether it is malicious. Investigate it together with the ' +
  'other alerts on the same host and user. Classify it as true_positive (malicious activity that ' +
  'needs escalation), false_positive (benign activity, nothing to escalate) or inconclusive ' +
  '(not enough evidence to decide). Explain your reasoning briefly. End your reply with one ' +
  `final line in exactly this form: Verdict: ${CLASSIFICATIONS.join('|')} ` +
  '(replace the list with your single chosen classification).';

interface RelatedAlertExample extends Example {
  input: { question: string };
  output: { classification: string };
  metadata: { caseId: string; description: string };
}

evaluate.describe(
  'Security Alert Triage — related-alert sensitivity',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    const indexedAlertIds = new Set<string>();

    const deleteAlerts = (esClient: EsClient, ids: string[]) =>
      esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { ids: { values: ids } },
        refresh: true,
        conflicts: 'proceed',
      });

    evaluate.beforeAll(async ({ esClient }: { esClient: EsClient }) => {
      await ensureAlertsIndex(esClient);
    });

    evaluate.afterAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      if (indexedAlertIds.size === 0) {
        return;
      }
      log.info(`Deleting ${indexedAlertIds.size} leftover related-alert eval alerts`);
      await deleteAlerts(esClient, [...indexedAlertIds]);
    });

    evaluate(
      'keeps the verdict on the target alert when related alerts carry scary rule names',
      async ({ executorClient, esClient, fetch, log, connector }) => {
        // The id-only case is excluded: get-related-alerts correlates by name/IP only.
        const examples: RelatedAlertExample[] = TRIAGE_RELATED_ALERT_CASES.map((testCase) => ({
          id: testCase.id,
          input: { question: VERDICT_QUESTION },
          output: { classification: testCase.expected },
          metadata: { caseId: testCase.id, description: testCase.description },
        }));

        await executorClient.runExperiment(
          {
            concurrency: 1,
            datasets: [
              {
                name: 'agent builder: security-alert-triage-related-alert-sensitivity',
                description:
                  'Runs the default agent on a target alert whose host and user are shared with ' +
                  'related alerts (scary rule names, benign or malicious command lines, one ' +
                  'injected instruction) and grades the final Verdict line against the label. ' +
                  'VerdictAccuracyWithRelated is the headline: it credits the verdict only when ' +
                  'get-related-alerts returned related alerts (RelatedAlertsRetrieved).',
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async ({ input, metadata }) => {
              const { caseId } = metadata as { caseId: string };
              const testCase = TRIAGE_RELATED_ALERT_CASES.find(({ id }) => id === caseId);
              if (!testCase) {
                throw new Error(`No related-alert case ${caseId}`);
              }

              const docs = buildCaseDocs(testCase, randomUUID());
              const ids = docs.map(({ id }) => id);
              ids.forEach((id) => indexedAlertIds.add(id));

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
                return await callConverse({
                  fetch,
                  connectorId: connector.id,
                  question: input.question,
                  attachments: [{ type: 'security.alerts', data: { alertIds: [ids[0]] } }],
                  log,
                });
              } finally {
                await deleteAlerts(esClient, ids)
                  .then(() => ids.forEach((id) => indexedAlertIds.delete(id)))
                  .catch((error: unknown) => {
                    // Left in indexedAlertIds so afterAll sweeps it.
                    log.warning(
                      `Failed to delete related-alert eval alerts ${ids.join(', ')}: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                  });
              }
            },
          },
          selectEvaluators([
            verdictAccuracyWithRelated,
            verdictAccuracy,
            verdictParsed,
            relatedAlertsRetrieved,
          ])
        );
      }
    );
  }
);
