/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../fixtures';
import {
  azureConnectorPayload,
  createAzureConnector,
  createConversation,
  deleteConnectors,
  deleteConversations,
  deletePrompts,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

const testPrompt = {
  name: 'Cool prompt',
  content: 'This is a super cool prompt.',
};

const mockConvo1 = { id: 'spooky', title: 'Spooky convo', messages: [] };
const mockConvo2 = { id: 'silly', title: 'Silly convo', messages: [] };

test.describe('AI Assistant Quick Prompts', { tag: ['@ess', '@svlSecurity'] }, () => {
  test.beforeEach(async ({ kbnClient, esClient, browserAuth }) => {
    await deleteConnectors(kbnClient);
    await deleteConversations(esClient);
    await deletePrompts(esClient);
    await createAzureConnector(kbnClient);
    await createConversation(kbnClient, mockConvo1);
    await createConversation(kbnClient, mockConvo2);
    await browserAuth.loginAsAdmin();
  });

  test('Add a quick prompt and send it in the conversation', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    test.setTimeout(180_000);
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();
    await pageObjects.assistant.createQuickPrompt(testPrompt.name, testPrompt.content);
    await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
    await pageObjects.assistant.assertConnectorSelected(azureConnectorPayload.name);
    await pageObjects.assistant.sendQuickPrompt(testPrompt.name);
    await pageObjects.assistant.assertMessageSent(testPrompt.content);
    await pageObjects.assistant.assertErrorResponse();
  });
});
