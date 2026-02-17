/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { evaluate as base } from '@kbn/evals';
import { EsArchiver } from '@kbn/es-archiver';
import { Client as QuickstartClient } from '@kbn/security-solution-plugin/common/api/quickstart_client.gen';
import { EvaluationChatClient } from './chat_client';
import type { EvaluateDataset } from './evaluate_dataset';
import { createEvaluateDataset } from './evaluate_dataset';

export const evaluate = base.extend<
  { evaluateDataset: EvaluateDataset },
  {
    chatClient: EvaluationChatClient;
    esArchiverLoad: (archive: string) => Promise<void>;
    supertest: supertest.Agent;
    quickApiClient: QuickstartClient;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new EvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          onExperimentComplete: async (experiment) => {
            // Build a lookup: experimentRunId -> evaluation results
            const evaluationsByRunId = new Map<
              string,
              Array<{
                evaluator: string;
                score?: number | null;
                label?: string | null;
                explanation?: string;
                metadata?: Record<string, unknown> | null;
              }>
            >();
            for (const evalRun of experiment.evaluationRuns) {
              const key = evalRun.experimentRunId;
              if (!evaluationsByRunId.has(key)) {
                evaluationsByRunId.set(key, []);
              }
              evaluationsByRunId.get(key)!.push({
                evaluator: evalRun.name,
                score: evalRun.result?.score,
                label: evalRun.result?.label,
                explanation: evalRun.result?.explanation ?? undefined,
                metadata: evalRun.result?.metadata ?? null,
              });
            }

            // Attach one file per example for easy per-case review in the HTML report
            const sanitizedDataset = experiment.datasetName.replace(/[^a-zA-Z0-9-_ ]/g, '');
            for (const [runId, run] of Object.entries(experiment.runs)) {
              const output = run.output as {
                messages?: Array<{ message: string }>;
                steps?: Array<Record<string, unknown>>;
                errors?: unknown[];
              };

              const question =
                (run.input as { question?: string })?.question ?? `example-${run.exampleIndex}`;
              // Short label for the attachment name (truncate long questions)
              const shortQuestion = question.length > 60 ? `${question.slice(0, 57)}...` : question;

              const conversation = {
                input: run.input,
                expected: run.expected,
                metadata: run.metadata,
                response: output?.messages?.slice(-1)?.[0]?.message ?? null,
                steps: output?.steps ?? [],
                errors: output?.errors ?? [],
                evaluations: evaluationsByRunId.get(runId) ?? [],
              };

              try {
                await testInfo.attach(
                  `[${sanitizedDataset}] #${run.exampleIndex} "${shortQuestion}"`,
                  {
                    body: JSON.stringify(conversation, null, 2),
                    contentType: 'application/json',
                  }
                );
              } catch (err) {
                log.warning(
                  `Failed to attach example data: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              }
            }
          },
        })
      );
    },
    { scope: 'test' },
  ],
  esArchiverLoad: [
    async ({ log, esClient, kbnClient }, use) => {
      const esArchiver = new EsArchiver({
        log,
        client: esClient,
        kbnClient,
      });

      const loadedArchivers: Set<string> = new Set();

      await use(async (archive: string) => {
        loadedArchivers.add(archive);
        await esArchiver.load(archive);
      });

      // Teardown: unload all loaded archivers
      for (const archive of loadedArchivers) {
        await esArchiver.unload(archive);
      }
    },
    { scope: 'worker' },
  ],
  supertest: [
    async ({ config, log }, use) => {
      const kibanaServerUrl = formatUrl(config.hosts.kibana);
      // Remove last character of kibanaServerUrl because it's a trailing slash and it's not working with supertest.agent
      const kibanaServerUrlWithoutLastCharacter = kibanaServerUrl.slice(0, -1);

      const testAgent = supertest
        .agent(kibanaServerUrlWithoutLastCharacter)
        .auth(config.auth.username, config.auth.password);

      log.serviceLoaded?.(`supertest at ${kibanaServerUrl}`);
      await use(testAgent);
    },
    { scope: 'worker' },
  ],
  quickApiClient: [
    async ({ kbnClient, log }, use) => {
      const quickstartClient = new QuickstartClient({
        kbnClient,
        log,
      });
      await use(quickstartClient);
    },
    { scope: 'worker' },
  ],
});
