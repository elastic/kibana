/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../fixtures';
import {
  azureConnectorPayload,
  bedrockConnectorPayload,
  createAzureConnector,
  createBedrockConnector,
  createConversation,
  deleteConnectors,
  deleteConversations,
  deleteAlertsAndRules,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

const mockConvo1 = { id: 'spooky', title: 'Spooky convo', messages: [] };
const mockConvo2 = { id: 'silly', title: 'Silly convo', messages: [] };

test.describe(
  'AI Assistant Conversations',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deleteAlertsAndRules(kbnClient);
    });

    test.afterEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deleteAlertsAndRules(kbnClient);
    });

    test('Shows welcome setup when no connectors or conversations exist', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await expect(pageObjects.assistant.welcomeSetup).toBeVisible();
      await expect(pageObjects.assistant.titleHeading).toHaveText('New chat');
    });

    test('Creating a new connector from welcome setup automatically sets the connector', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();
      await pageObjects.assistant.createOpenAIConnector('My OpenAI Connector');

      await expect(pageObjects.assistant.connectorSelector).toHaveText('My OpenAI Connector');
    });

    test('Properly switches back and forth between conversations', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await createConversation(kbnClient, mockConvo1);
      await createConversation(kbnClient, mockConvo2);
      await createAzureConnector(kbnClient);
      await createBedrockConnector(kbnClient);
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await test.step('select first conversation and send message', async () => {
        await pageObjects.assistant.selectConversation(mockConvo1.title);
        await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
        await pageObjects.assistant.typeAndSendMessage('hello');
        await expect(pageObjects.assistant.messageAt(0)).toContainText('hello');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });

      await test.step('select second conversation and send message', async () => {
        await pageObjects.assistant.selectConversation(mockConvo2.title);
        await pageObjects.assistant.selectConnector(bedrockConnectorPayload.name);
        await pageObjects.assistant.typeAndSendMessage('goodbye');
        await expect(pageObjects.assistant.messageAt(0)).toContainText('goodbye');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });

      await test.step('switch back and verify persistence', async () => {
        await pageObjects.assistant.selectConversation(mockConvo1.title);
        await expect(pageObjects.assistant.connectorSelector).toHaveText(
          azureConnectorPayload.name
        );
        await expect(pageObjects.assistant.messageAt(0)).toContainText('hello');

        await pageObjects.assistant.selectConversation(mockConvo2.title);
        await expect(pageObjects.assistant.connectorSelector).toHaveText(
          bedrockConnectorPayload.name
        );
        await expect(pageObjects.assistant.messageAt(0)).toContainText('goodbye');
      });
    });

    test('Correctly creates and titles new conversations', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await createAzureConnector(kbnClient);
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();
      await pageObjects.assistant.createAndTitleConversation(
        'Something else',
        azureConnectorPayload.name
      );

      await expect(pageObjects.assistant.titleHeading).toHaveText('Something else');
    });
  }
);
