/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from './fixtures';
import {
  azureConnectorPayload,
  bedrockConnectorPayload,
  createAzureConnector,
  createBedrockConnector,
  createConversation,
  deleteConnectors,
  deleteConversations,
  deleteAlertsAndRules,
} from './common/api_helpers';
import { waitForPageReady } from './common/constants';

const mockConvo1 = { id: 'spooky', title: 'Spooky convo', messages: [] };
const mockConvo2 = { id: 'silly', title: 'Silly convo', messages: [] };

test.describe(
  'AI Assistant Conversations - Welcome Setup',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    test.beforeEach(async ({ kbnClient, esClient }) => {
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
      await pageObjects.assistant.assertNewConversation(true, 'New chat');
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
      await pageObjects.assistant.assertConnectorSelected('My OpenAI Connector');
    });
  }
);

test.describe(
  'AI Assistant Conversations - Switching',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    test.beforeEach(async ({ kbnClient, esClient, browserAuth }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deleteAlertsAndRules(kbnClient);
      await createConversation(kbnClient, mockConvo1);
      await createConversation(kbnClient, mockConvo2);
      await createAzureConnector(kbnClient);
      await createBedrockConnector(kbnClient);
      await browserAuth.loginAsAdmin();
    });

    test('Properly switches back and forth between conversations', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      // Select first conversation and send message
      await pageObjects.assistant.selectConversation(mockConvo1.title);
      await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
      await pageObjects.assistant.typeAndSendMessage('hello');
      await pageObjects.assistant.assertMessageSent('hello');
      await pageObjects.assistant.assertErrorResponse();

      // Select second conversation and send message
      await pageObjects.assistant.selectConversation(mockConvo2.title);
      await pageObjects.assistant.selectConnector(bedrockConnectorPayload.name);
      await pageObjects.assistant.typeAndSendMessage('goodbye');
      await pageObjects.assistant.assertMessageSent('goodbye');
      await pageObjects.assistant.assertErrorResponse();

      // Switch back and verify persistence
      await pageObjects.assistant.selectConversation(mockConvo1.title);
      await pageObjects.assistant.assertConnectorSelected(azureConnectorPayload.name);
      await pageObjects.assistant.assertMessageSent('hello');

      await pageObjects.assistant.selectConversation(mockConvo2.title);
      await pageObjects.assistant.assertConnectorSelected(bedrockConnectorPayload.name);
      await pageObjects.assistant.assertMessageSent('goodbye');
    });

    test('Correctly creates and titles new conversations', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();
      await pageObjects.assistant.createAndTitleConversation(
        'Something else',
        azureConnectorPayload.name
      );
    });
  }
);
