/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import { EsArchiver } from '@kbn/es-archiver';
import { Client as QuickstartClient } from '@kbn/security-solution-plugin/common/api/quickstart_client.gen';
import { KbnClient } from '@kbn/test';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { EvaluationChatClient } from './chat_client';
import type { EvaluateDataset } from './evaluate_dataset';
import { createEvaluateDataset } from './evaluate_dataset';

function createKibanaClientUrlWithAuth({
  url,
  username,
  password,
}: {
  url: string;
  username: string;
  password: string;
}): string {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;
  return clientUrl.toString();
}

function withSpaceBasePath(urlWithAuth: string, spaceId: string): string {
  return `${urlWithAuth.replace(/\/$/, '')}/s/${spaceId}`;
}

export const evaluate = base.extend<
  {
    evaluateDataset: EvaluateDataset;
  },
  {
    chatClient: EvaluationChatClient;
    siemSetup: void;
    esArchiverLoad: (archive: string) => Promise<void>;
    supertest: supertest.Agent;
    quickApiClient: QuickstartClient;
    spaceId: string;
    globalKbnClient: KbnClient;
    kbnClient: KbnClient;
  }
>({
  spaceId: [
    async ({ globalKbnClient, log }, use, workerInfo) => {
      const spaceId = `skills-evals-w${workerInfo.parallelIndex + 1}`;
      const skipCleanup =
        process.env.SECURITY_SOLUTION_EVALS_SKIP_CLEANUP === 'true' ||
        process.env.SECURITY_SOLUTION_EVALS_SKIP_CLEANUP === '1';

      try {
        await globalKbnClient.spaces.create({
          id: spaceId,
          name: spaceId,
          disabledFeatures: [],
        });
        log.serviceMessage?.('spaces', `Created Kibana space '${spaceId}'`);
      } catch (error) {
        // Best-effort: space may already exist from a previous crashed run.
        log.debug(`Space create failed for '${spaceId}', continuing. ${String(error)}`);
      }

      await use(spaceId);

      if (skipCleanup) {
        log.info(`[SKIP_CLEANUP] Skipping space deletion for '${spaceId}' (debug mode)`);
        return;
      }

      try {
        await globalKbnClient.spaces.delete(spaceId);
        log.serviceMessage?.('spaces', `Deleted Kibana space '${spaceId}'`);
      } catch (error) {
        log.debug(`Space delete failed for '${spaceId}', continuing. ${String(error)}`);
      }
    },
    { scope: 'worker', auto: true },
  ],

  globalKbnClient: [
    async ({ log, config }, use) => {
      const urlWithAuth = createKibanaClientUrlWithAuth({
        url: config.hosts.kibana as unknown as string,
        username: config.auth.username,
        password: config.auth.password,
      });

      await use(new KbnClient({ log, url: urlWithAuth }));
    },
    { scope: 'worker' },
  ],

  // Override kbnClient to be space-scoped, so @kbn/evals `fetch` and connector fixtures operate within the worker space.
  kbnClient: [
    async ({ log, config, spaceId }, use) => {
      const urlWithAuth = createKibanaClientUrlWithAuth({
        url: config.hosts.kibana as unknown as string,
        username: config.auth.username,
        password: config.auth.password,
      });

      const spaceUrlWithAuth = withSpaceBasePath(urlWithAuth, spaceId);
      await use(new KbnClient({ log, url: spaceUrlWithAuth }));
    },
    { scope: 'worker' },
  ],

  // Override connector fixtures so parallel workers do NOT contend on a single deterministic connector id.
  connector: [
    async ({ fetch, log, spaceId }, use, testInfo) => {
      const predefinedConnector = (
        testInfo.project.use as unknown as { connector: AvailableConnectorWithId }
      ).connector;

      // Create (or reuse) a persistent connector saved object for this eval run.
      //
      // We intentionally DO NOT delete this connector in fixture teardown because evaluators may still
      // call inference endpoints after the test body completes. Cleanup is handled in globalTeardown.
      const testRunId = process.env.TEST_RUN_ID ?? 'local';
      const desiredName = `security-solution-evals:${testRunId}:${spaceId}:connector:${predefinedConnector.id}`;

      const existing = (await fetch('/api/actions/connectors')) as Array<{
        id: string;
        name: string;
        is_preconfigured?: boolean;
      }>;

      const reusable = existing.find((c) => c.name === desiredName && !c.is_preconfigured);
      if (reusable) {
        log.info(`Reusing eval connector (space=${spaceId}): ${reusable.id} (${desiredName})`);
        await use({ ...predefinedConnector, id: reusable.id, name: desiredName });
        return;
      }

      log.info(`Creating eval connector (space=${spaceId}): ${desiredName}`);
      const created = (await fetch({
        path: `/api/actions/connector`,
        method: 'POST',
        body: JSON.stringify({
          config: predefinedConnector.config,
          connector_type_id: predefinedConnector.actionTypeId,
          name: desiredName,
          secrets: predefinedConnector.secrets,
        }),
      })) as { id: string };

      await use({ ...predefinedConnector, id: created.id, name: desiredName });
    },
    { scope: 'worker' },
  ],

  evaluationConnector: [
    async ({ fetch, log, connector, spaceId }, use, testInfo) => {
      const predefinedEvaluationConnector = (
        testInfo.project.use as unknown as { evaluationConnector: AvailableConnectorWithId }
      ).evaluationConnector;

      // If the evaluation connector is the same as the main connector, reuse it.
      if (predefinedEvaluationConnector.id === (testInfo.project.use as any).connector?.id) {
        await use(connector);
        return;
      }

      const testRunId = process.env.TEST_RUN_ID ?? 'local';
      const desiredName = `security-solution-evals:${testRunId}:${spaceId}:evaluationConnector:${predefinedEvaluationConnector.id}`;

      const existing = (await fetch('/api/actions/connectors')) as Array<{
        id: string;
        name: string;
        is_preconfigured?: boolean;
      }>;

      const reusable = existing.find((c) => c.name === desiredName && !c.is_preconfigured);
      if (reusable) {
        log.info(
          `Reusing eval evaluationConnector (space=${spaceId}): ${reusable.id} (${desiredName})`
        );
        await use({ ...predefinedEvaluationConnector, id: reusable.id, name: desiredName });
        return;
      }

      log.info(`Creating eval evaluationConnector (space=${spaceId}): ${desiredName}`);
      const created = (await fetch({
        path: `/api/actions/connector`,
        method: 'POST',
        body: JSON.stringify({
          config: predefinedEvaluationConnector.config,
          connector_type_id: predefinedEvaluationConnector.actionTypeId,
          name: desiredName,
          secrets: predefinedEvaluationConnector.secrets,
        }),
      })) as { id: string };

      await use({ ...predefinedEvaluationConnector, id: created.id, name: desiredName });
    },
    { scope: 'worker' },
  ],

  siemSetup: [
    async ({ fetch, log }, use) => {
      // Ensure Agent Builder API and experimental features (skills) are enabled
      const requiredSettings: Record<string, boolean> = {
        'agentBuilder:enabled': true,
        'agentBuilder:experimentalFeatures': true,
      };

      const currentSettings = (await fetch('/internal/kibana/settings')) as {
        settings: Record<string, { userValue?: unknown; isOverridden?: boolean }>;
      };

      const changesToApply: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(requiredSettings)) {
        const setting = currentSettings?.settings?.[key];

        if (setting?.isOverridden) {
          // Setting is overridden via config/CLI -- cannot change via API, just verify
          log.info(`${key} is overridden via config (value: ${setting.userValue})`);
          if (setting.userValue !== value) {
            log.error(
              `${key} is overridden to ${setting.userValue} but expected ${value}. ` +
                `Update the Kibana config or CLI args to set it correctly.`
            );
          }
        } else if (setting?.userValue !== value) {
          changesToApply[key] = value;
        } else {
          log.info(`${key} already set to ${value}`);
        }
      }

      if (Object.keys(changesToApply).length > 0) {
        await fetch('/internal/kibana/settings', {
          method: 'POST',
          body: JSON.stringify({ changes: changesToApply }),
        });
        log.info(`Enabled settings: ${Object.keys(changesToApply).join(', ')}`);
      }

      await use();
    },
    {
      scope: 'worker',
      auto: true, // This ensures it runs automatically
    },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new EvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  reportModelScore: [
    async ({}, use) => {
      await use(createDefaultTerminalReporter());
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    async ({ chatClient, evaluators, executorClient, log }, use, testInfo) => {
      await use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          log,
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
      const skipCleanup =
        process.env.SECURITY_SOLUTION_EVALS_SKIP_CLEANUP === 'true' ||
        process.env.SECURITY_SOLUTION_EVALS_SKIP_CLEANUP === '1';

      const esArchiver = new EsArchiver({
        log,
        client: esClient,
        kbnClient,
      });

      const loadedArchivers: Set<string> = new Set();

      await use(async (archive: string) => {
        if (loadedArchivers.has(archive)) {
          log.debug(`esArchiver.load('${archive}') skipped (already loaded in this worker)`);
          return;
        }

        loadedArchivers.add(archive);
        await esArchiver.load(archive);
      });

      // Teardown: unload all loaded archivers
      if (skipCleanup) {
        log.info(
          `[SKIP_CLEANUP] Skipping esArchiver unload for ${loadedArchivers.size} archive(s) (debug mode)`
        );
        return;
      }

      for (const archive of loadedArchivers) {
        await esArchiver.unload(archive);
      }
    },
    { scope: 'worker' },
  ],
  supertest: [
    async ({ config, log, spaceId }, use) => {
      const kibanaServerUrl = formatUrl(config.hosts.kibana);
      // Remove last character of kibanaServerUrl because it's a trailing slash and it's not working with supertest.agent
      const kibanaServerUrlWithoutLastCharacter = kibanaServerUrl.slice(0, -1);

      const kibanaSpaceBaseUrl = `${kibanaServerUrlWithoutLastCharacter}/s/${spaceId}`;
      const testAgent = supertest
        .agent(kibanaSpaceBaseUrl)
        .auth(config.auth.username, config.auth.password);

      log.serviceLoaded?.(`supertest at ${kibanaSpaceBaseUrl}`);
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
