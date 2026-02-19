/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../fixtures';
import {
  createAzureConnector,
  deleteConnectors,
  deleteConversations,
} from '../common/api_helpers';
import {
  getAvailableLLMConnectors,
  createLLMConnector,
  deleteLLMConnector,
} from '../common/connectors';
import { waitForPageReady } from '../common/constants';

const ESQL_QUERY = 'from auditbeat-* | where ecs.version == "8.0.0" | limit 1';
const KQL_QUERY = '_index : "auditbeat-*" and ecs.version : "8.0.0"';
const EQL_QUERY = 'process where process.name == "zsh"';

const llmConnectors = getAvailableLLMConnectors();
const hasLLMConnectors = llmConnectors.length > 0;

test.describe(
  'ES|QL / KQL / EQL Assistant Query Propagation',
  { tag: [...tags.stateful.classic] },
  () => {
    let connectorName: string;

    test.beforeEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);

      if (hasLLMConnectors) {
        const created = await createLLMConnector(kbnClient, llmConnectors[0]);
        connectorName = created.name;
      } else {
        await createAzureConnector(kbnClient);
        connectorName = 'Azure OpenAI scout test connector';
      }
    });

    test.afterEach(async ({ kbnClient, esClient }) => {
      if (hasLLMConnectors) {
        await deleteLLMConnector(kbnClient, llmConnectors[0]);
      }
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
    });

    test('should propagate ES|QL query to discover via Investigate in timeline', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();

      await test.step('navigate to alerts and open assistant', async () => {
        await page.goto(kbnUrl.get('/app/security/alerts'));
        await waitForPageReady(page);
        await pageObjects.assistant.openAssistant();
        await pageObjects.assistant.selectConnector(connectorName);
      });

      await test.step('type ES|QL code block and click Investigate in timeline', async () => {
        await pageObjects.assistant.typeMultiLineAndSend([
          'Below is an ES|QL query:',
          '```esql',
          ESQL_QUERY,
          '```',
        ]);
        await expect(pageObjects.assistant.messageAt(0)).toContainText(ESQL_QUERY);
        await pageObjects.assistant.investigateInTimelineButton.click();
      });

      await test.step('verify ES|QL query in discover', async () => {
        await expect(page.testSubj.locator('kibanaCodeEditor')).toContainText(ESQL_QUERY, {
          timeout: 15_000,
        });
      });
    });

    test('should propagate KQL query to timeline via Investigate in timeline', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();

      await test.step('navigate to alerts and open assistant', async () => {
        await page.goto(kbnUrl.get('/app/security/alerts'));
        await waitForPageReady(page);
        await pageObjects.assistant.openAssistant();
        await pageObjects.assistant.selectConnector(connectorName);
      });

      await test.step('type KQL code block and click Investigate in timeline', async () => {
        await pageObjects.assistant.typeMultiLineAndSend([
          'Below is a KQL query:',
          '```kql',
          KQL_QUERY,
          '```',
        ]);
        await expect(pageObjects.assistant.messageAt(0)).toContainText(KQL_QUERY);
        await pageObjects.assistant.investigateInTimelineButton.click();
      });

      await test.step('verify KQL query in timeline', async () => {
        await expect(page.testSubj.locator('timelineQueryInput')).toHaveText(KQL_QUERY, {
          timeout: 15_000,
        });
      });
    });

    test('should propagate EQL query to timeline via Investigate in timeline', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();

      await test.step('navigate to alerts and open assistant', async () => {
        await page.goto(kbnUrl.get('/app/security/alerts'));
        await waitForPageReady(page);
        await pageObjects.assistant.openAssistant();
        await pageObjects.assistant.selectConnector(connectorName);
      });

      await test.step('type EQL code block and click Investigate in timeline', async () => {
        await pageObjects.assistant.typeMultiLineAndSend([
          'Below is an EQL query:',
          '```eql',
          EQL_QUERY,
          '```',
        ]);
        await expect(pageObjects.assistant.messageAt(0)).toContainText(EQL_QUERY);
        await pageObjects.assistant.investigateInTimelineButton.click();
      });

      await test.step('verify EQL query in timeline', async () => {
        await expect(page.testSubj.locator('eqlQueryBarTextInput')).toContainText(EQL_QUERY, {
          timeout: 15_000,
        });
      });
    });
  }
);
