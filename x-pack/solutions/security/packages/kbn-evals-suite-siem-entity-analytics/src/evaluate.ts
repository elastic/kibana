/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import { EsArchiver } from '@kbn/es-archiver';
import { Client as QuickstartClient } from '@kbn/security-solution-plugin/common/api/quickstart_client.gen';
import { SiemEntityAnalyticsEvaluationChatClient } from './chat_client';
import type { EvaluateDataset } from './evaluate_dataset';
import { createEvaluateDataset } from './evaluate_dataset';

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
  }
>({
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
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
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
