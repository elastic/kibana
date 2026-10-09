/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

/**
 * Escalation summary + escalation-context chat grounded-QA eval
 * (security-team#19927, gap G19).
 *
 * Each example seeds an escalation with N=2–5 linked investigations carrying
 * distinct planted facts — including one fact that exists only in the LAST
 * investigation — waits for the investigation-summary workflow to write
 * `metadata.summary`, then asks the escalation-context chat every case
 * question.
 *
 * Metrics (per case, deterministic except where noted):
 * - ClaimGrounding (kind LLM) — the grounding gate. The judge (evaluation
 *   connector, pinned to gemini-3-1-pro and never the model under test) checks
 *   every summary claim traces to a linked investigation.
 * - SummaryKeyMentionRecall — fraction of planted facts whose key is mentioned in
 *   the summary.
 * - ChatKeyMentionRecall — over questions whose answer lives in exactly one
 *   investigation.
 * - UnsupportedNumericSpecifics — count of summary sentences asserting a numeric
 *   specific that appears in no investigation the product saw.
 *
 * Key-mention recall proves keys were mentioned, not that they are grounded.
 *
 * The summary runs on the `alertzero_reasoning` feature connector, not the model
 * under test; beforeAll routes that feature to the connector under test and
 * afterAll restores it, so summary metrics are per-model.
 *
 * Mutation variant (ESCALATION_MUTATION=drop-last): each case drops its LAST
 * linked investigation from the escalation context. Recall (graded on the full
 * labels) MUST fall; ClaimGrounding and unsupported specifics are graded against
 * the corpus WITHOUT the dropped investigation. This is
 * the mutation test proving the metrics are load-bearing.
 *
 * ESCALATION_SPACE_ID (G20 hook): run every request under `/s/<id>`.
 */

import type { EvalConnector, EvaluationDataset, Example } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate, selectEvaluators } from '../src/evaluate';
import { escalationCases, validateCases } from '../src/dataset';
import { runEscalationCase, withSpace } from '../src/escalation_world';
import { overrideInferenceFeature, SUMMARY_INFERENCE_FEATURE_ID } from '../src/inference_override';
import { assertJudgeIsolation } from '../src/judge';
import type { EscalationCase } from '../src/types';
import {
  chatKeyMentionRecall,
  createClaimGroundingEvaluator,
  unsupportedNumericSpecificsCount,
  summaryKeyMentionRecall,
} from '../src/evaluators';

type DatasetExample = Example<{ caseId: string }, { c: EscalationCase }, { description: string }>;

const MUTATION = process.env.ESCALATION_MUTATION === 'drop-last';
const SUMMARY_WORKFLOW_ID = 'system-alertzero-investigation-summary';
/** G20 hook: run the whole suite inside this Kibana space (`/s/<id>`). */
const SPACE_ID = process.env.ESCALATION_SPACE_ID || undefined;

const datasetIssues = validateCases(escalationCases);
if (datasetIssues.length > 0) {
  throw new Error(`Escalation dataset invalid: ${JSON.stringify(datasetIssues)}`);
}

const cases = MUTATION
  ? escalationCases.filter((c) => c.investigations.length > 2)
  : escalationCases;

const examples: DatasetExample[] = cases.map((c) => ({
  id: MUTATION ? `${c.id}-drop-last` : c.id,
  input: { caseId: c.id },
  output: { c },
  metadata: { description: c.description },
}));

evaluate.describe(
  MUTATION
    ? 'Escalation grounded-QA (mutation: drop last investigation)'
    : 'Escalation grounded-QA',
  { tag: tags.stateful.classic },
  () => {
    // The investigation-summary step runs on the `alertzero_reasoning` feature
    // connector, not the model under test. Route that feature to the connector
    // under test for the run so summary metrics are per-model, then restore it.
    let restoreInferenceSettings: (() => Promise<void>) | undefined;

    evaluate.beforeAll(
      async ({
        fetch: baseFetch,
        connector,
        evaluationConnector,
        log,
      }: {
        fetch: HttpHandler;
        connector: EvalConnector;
        evaluationConnector: EvalConnector;
        log: ToolingLog;
      }) => {
        assertJudgeIsolation({ connector, evaluationConnector, log });
        const fetch = withSpace(baseFetch, SPACE_ID);
        const workflow = await fetch<{ enabled: boolean }>(
          `/api/workflows/workflow/${encodeURIComponent(SUMMARY_WORKFLOW_ID)}`,
          { method: 'GET', version: '2023-10-31', headers: { 'elastic-api-version': '2023-10-31' } }
        ).catch(() => undefined);
        if (workflow && !workflow.enabled) {
          log.warning(
            `${SUMMARY_WORKFLOW_ID} is disabled; summaries will be missing and the summary metrics will read 0`
          );
        }
        restoreInferenceSettings = await overrideInferenceFeature({
          fetch,
          featureId: SUMMARY_INFERENCE_FEATURE_ID,
          endpointId: connector.id,
        });
        log.info(`Summary feature ${SUMMARY_INFERENCE_FEATURE_ID} routed to ${connector.id}`);
      }
    );

    evaluate.afterAll(async ({ log }: { log: ToolingLog }) => {
      await restoreInferenceSettings?.().catch((error: Error) =>
        log.warning(`Could not restore inference settings: ${error.message}`)
      );
    });

    evaluate(
      MUTATION
        ? 'escalation summary/chat recall drops when the last investigation is removed'
        : 'escalation summary and chat answers cover every linked investigation',
      async ({ executorClient, fetch, connector, evaluationConnector, inferenceClient, log }) => {
        const judgeClient = inferenceClient.bindTo({ connectorId: evaluationConnector.id });

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'security: escalation-grounded-qa',
                description:
                  `Grounded-QA set for the Escalations feature (security-team#19927): each case is an ` +
                  `escalation with 2-5 linked investigations carrying distinct planted facts, one only in ` +
                  `the last investigation. Scores summary ClaimGrounding (LLM judge), deterministic ` +
                  `key-mention recall in the summary, deterministic chat-answer key-mention recall over questions ` +
                  `answered by exactly one investigation, and a deterministic unsupported-numeric-specifics count.${
                    MUTATION
                      ? ' Mutation variant: the last linked investigation is dropped from the context; recall must fall.'
                      : ''
                  }`,
                examples,
              } satisfies EvaluationDataset,
            ],
            task: async (example) => {
              const caseId = example.input?.caseId;
              const c = escalationCases.find((item) => item.id === caseId);
              if (!c) {
                throw new Error(`Unknown case ${caseId}`);
              }
              return runEscalationCase({
                fetch,
                log,
                c,
                agentId: agentBuilderDefaultAgentId,
                connectorId: connector.id,
                mutation: MUTATION ? { dropInvestigation: c.investigations.length - 1 } : undefined,
                spaceId: SPACE_ID,
              }) as never;
            },
          },
          selectEvaluators([
            createClaimGroundingEvaluator({ inferenceClient: judgeClient, log }),
            summaryKeyMentionRecall,
            chatKeyMentionRecall,
            unsupportedNumericSpecificsCount,
          ])
        );
      }
    );
  }
);
