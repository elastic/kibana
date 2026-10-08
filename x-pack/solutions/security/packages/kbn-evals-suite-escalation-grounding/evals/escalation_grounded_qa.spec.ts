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
 * - ClaimGrounding — LLM judge (evaluation connector) checks every summary
 *   claim traces to a linked investigation. The only LLM in the suite.
 * - SummaryPlantedFactRecall — fraction of planted facts whose key appears in
 *   the summary.
 * - ChatAnswerRecall — over questions whose answer lives in exactly one
 *   investigation.
 * - HallucinationCount — count of summary sentences whose specific tokens
 *   appear in no linked investigation.
 *
 * Mutation variant (ESCALATION_MUTATION=drop-last): each case drops its LAST
 * linked investigation from the escalation context. Recall MUST fall — this is
 * the mutation test proving the metrics are load-bearing.
 */

import type { EvaluationDataset, Example } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate, selectEvaluators } from '../src/evaluate';
import { escalationCases, validateCases } from '../src/dataset';
import { runEscalationCase } from '../src/escalation_world';
import type { EscalationCase } from '../src/types';
import {
  chatAnswerRecall,
  createClaimGroundingEvaluator,
  hallucinationCount,
  summaryPlantedFactRecall,
} from '../src/evaluators';

type DatasetExample = Example<{ caseId: string }, { c: EscalationCase }, { description: string }>;

const MUTATION = process.env.ESCALATION_MUTATION === 'drop-last';
const SUMMARY_WORKFLOW_ID = 'system-alertzero-investigation-summary';

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
    evaluate.beforeAll(async ({ fetch, log }: { fetch: HttpHandler; log: ToolingLog }) => {
      const workflow = await fetch<{ enabled: boolean }>(
        `/api/workflows/workflow/${encodeURIComponent(SUMMARY_WORKFLOW_ID)}`,
        { method: 'GET', version: '2023-10-31', headers: { 'elastic-api-version': '2023-10-31' } }
      ).catch(() => undefined);
      if (workflow && !workflow.enabled) {
        log.warning(
          `${SUMMARY_WORKFLOW_ID} is disabled; summaries will be missing and the summary metrics will read 0`
        );
      }
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
                  `planted-fact recall in the summary, deterministic chat-answer recall over questions ` +
                  `answered by exactly one investigation, and a deterministic hallucination count.${
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
              }) as never;
            },
          },
          selectEvaluators([
            createClaimGroundingEvaluator({ inferenceClient: judgeClient, log }),
            summaryPlantedFactRecall,
            chatAnswerRecall,
            hallucinationCount,
          ])
        );
      }
    );
  }
);
