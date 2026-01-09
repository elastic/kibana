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
import { isAxiosError } from 'axios';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { SiemEntityAnalyticsEvaluationChatClient } from './chat_client';
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
    chatClient: SiemEntityAnalyticsEvaluationChatClient;
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
      const predefinedConnector = (testInfo.project.use as unknown as { connector: AvailableConnectorWithId })
        .connector;

      // Prefer using the preconfigured connector directly when available in this Kibana instance.
      // This avoids creating ephemeral connectors that may not be resolvable by server-side consumers
      // (e.g. agent_builder middleware) depending on how Actions/SO namespaces are wired.
      const existingConnectors = (await fetch('/api/actions/connectors')) as Array<{
        id: string;
        is_preconfigured?: boolean;
      }>;
      const matchingPreconfigured = existingConnectors.find(
        (c) => c.id === predefinedConnector.id && c.is_preconfigured === true
      );
      if (matchingPreconfigured) {
        log.info(
          `Using preconfigured connector (space=${spaceId}): ${predefinedConnector.id} (no create/delete)`
        );
        await use(predefinedConnector);
        return;
      }

      async function deleteConnector(connectorId: string) {
        await fetch({
          path: `/api/actions/connector/${connectorId}`,
          method: 'DELETE',
        }).catch((error) => {
          if (isAxiosError(error) && (error.status === 404 || error.response?.status === 404)) {
            return;
          }
          if (typeof error?.message === 'string' && error.message.includes('Status: 404')) {
            return;
          }
          throw error;
        });
      }

      log.info(`Creating connector (space=${spaceId})`);
      const created = (await fetch({
        path: `/api/actions/connector`,
        method: 'POST',
        body: JSON.stringify({
          config: predefinedConnector.config,
          connector_type_id: predefinedConnector.actionTypeId,
          name: `${predefinedConnector.name} (space=${spaceId})`,
          secrets: predefinedConnector.secrets,
        }),
      })) as { id: string };

      const connectorWithCreatedId: AvailableConnectorWithId = {
        ...predefinedConnector,
        id: created.id,
      };

      await use(connectorWithCreatedId);

      log.info(`Deleting connector (space=${spaceId}): ${connectorWithCreatedId.id}`);
      await deleteConnector(connectorWithCreatedId.id);
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

      const existingConnectors = (await fetch('/api/actions/connectors')) as Array<{
        id: string;
        is_preconfigured?: boolean;
      }>;
      const matchingPreconfigured = existingConnectors.find(
        (c) => c.id === predefinedEvaluationConnector.id && c.is_preconfigured === true
      );
      if (matchingPreconfigured) {
        log.info(
          `Using preconfigured evaluation connector (space=${spaceId}): ${predefinedEvaluationConnector.id} (no create/delete)`
        );
        await use(predefinedEvaluationConnector);
        return;
      }

      async function deleteConnector(connectorId: string) {
        await fetch({
          path: `/api/actions/connector/${connectorId}`,
          method: 'DELETE',
        }).catch((error) => {
          if (isAxiosError(error) && (error.status === 404 || error.response?.status === 404)) {
            return;
          }
          if (typeof error?.message === 'string' && error.message.includes('Status: 404')) {
            return;
          }
          throw error;
        });
      }

      log.info(`Creating evaluation connector (space=${spaceId})`);
      const created = (await fetch({
        path: `/api/actions/connector`,
        method: 'POST',
        body: JSON.stringify({
          config: predefinedEvaluationConnector.config,
          connector_type_id: predefinedEvaluationConnector.actionTypeId,
          name: `${predefinedEvaluationConnector.name} (space=${spaceId})`,
          secrets: predefinedEvaluationConnector.secrets,
        }),
      })) as { id: string };

      const evaluationConnectorWithCreatedId: AvailableConnectorWithId = {
        ...predefinedEvaluationConnector,
        id: created.id,
      };

      await use(evaluationConnectorWithCreatedId);

      log.info(`Deleting evaluation connector (space=${spaceId}): ${evaluationConnectorWithCreatedId.id}`);
      await deleteConnector(evaluationConnectorWithCreatedId.id);
    },
    { scope: 'worker' },
  ],

  siemSetup: [
    async ({ fetch, log }, use) => {
      // Ensure Agent Builder API is enabled before running the evaluation
      const currentSettings = (await fetch('/internal/kibana/settings')) as {
        settings: Record<string, { userValue?: unknown }>;
      };
      const isAgentBuilderEnabled =
        currentSettings?.settings?.['agentBuilder:enabled']?.userValue === true;

      if (isAgentBuilderEnabled) {
        log.debug('Agent Builder is already enabled');
      } else {
        await fetch('/internal/kibana/settings', {
          method: 'POST',
          body: JSON.stringify({
            changes: {
              'agentBuilder:enabled': true,
            },
          }),
        });
        log.debug('Agent Builder enabled for the evaluation');
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
      const chatClient = new SiemEntityAnalyticsEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  reportModelScore: [
    async ({ }, use) => {
      await use(createDefaultTerminalReporter());
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
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
        if (loadedArchivers.has(archive)) {
          log.debug(`esArchiver.load('${archive}') skipped (already loaded in this worker)`);
          return;
        }

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
