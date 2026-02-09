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
  createPromptsBulk,
  deleteConnectors,
  deleteConversations,
  deletePrompts,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

const promptType = 'system';
const testPrompt = {
  name: 'Cool prompt',
  content: 'This is a super cool prompt.',
};

const customPrompt1 = {
  name: 'Custom system prompt',
  content: 'This is a custom system prompt.',
  promptType,
};
const customPrompt2 = {
  name: 'Enhanced system prompt',
  content: 'This is an enhanced system prompt.',
  promptType,
};
const mockConvo1 = { id: 'spooky', title: 'Spooky convo', messages: [] };
const mockConvo2 = { id: 'silly', title: 'Silly convo', messages: [] };

test.describe('AI Assistant System Prompts', { tag: ['@ess', '@svlSecurity'] }, () => {
  test.beforeEach(async ({ kbnClient, esClient, browserAuth }) => {
    await deleteConnectors(kbnClient);
    await deleteConversations(esClient);
    await deletePrompts(esClient);
    await createAzureConnector(kbnClient);
    await createConversation(kbnClient, mockConvo1);
    await createConversation(kbnClient, mockConvo2);
    await createPromptsBulk(kbnClient, [customPrompt2, customPrompt1]);
    await browserAuth.loginAsAdmin();
  });

  test('No prompt is selected by default, custom prompts can be selected and deselected', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();
    await pageObjects.assistant.assertEmptySystemPrompt();
    await pageObjects.assistant.selectSystemPrompt(customPrompt2.name);
    await pageObjects.assistant.selectSystemPrompt(customPrompt1.name);
    await pageObjects.assistant.clearSystemPrompt();
  });

  test('Deselecting a system prompt prevents prompt from being sent', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    test.setTimeout(180_000);
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();
    await pageObjects.assistant.selectSystemPrompt(customPrompt2.name);
    await pageObjects.assistant.clearSystemPrompt();
    await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
    await pageObjects.assistant.assertConnectorSelected(azureConnectorPayload.name);
    await pageObjects.assistant.typeAndSendMessage('hello');
    await pageObjects.assistant.assertMessageSent('hello');
    await pageObjects.assistant.assertErrorResponse();
    await pageObjects.assistant.resetConversation();
    await pageObjects.assistant.assertEmptySystemPrompt();
    await pageObjects.assistant.typeAndSendMessage('hello');
    await pageObjects.assistant.assertMessageSent('hello');
    await pageObjects.assistant.assertErrorResponse();
  });

  // Skipped in Cypress as well - fails on CI
  test.skip('Last selected system prompt persists in conversation', async () => {
    // Placeholder - skipped in original Cypress test
  });

  test('Add prompt from system prompt selector without setting a default conversation', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    test.setTimeout(180_000);
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();
    await pageObjects.assistant.createSystemPrompt(testPrompt.name, testPrompt.content);
    // No default conversation set => prompt should not be auto-selected
    await pageObjects.assistant.assertEmptySystemPrompt();
    await pageObjects.assistant.selectSystemPrompt(testPrompt.name);
    await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
    await pageObjects.assistant.assertConnectorSelected(azureConnectorPayload.name);
    await pageObjects.assistant.typeAndSendMessage('hello');
    await pageObjects.assistant.assertSystemPromptSent(testPrompt.content);
    await pageObjects.assistant.assertMessageSent('hello', true);
    await pageObjects.assistant.assertErrorResponse();
  });

  test('Add prompt and set multiple conversations as default', async ({
    page,
    pageObjects,
    kbnUrl,
  }) => {
    test.setTimeout(180_000);
    await page.goto(kbnUrl.get('/app/security/get_started'));
    await waitForPageReady(page);
    await pageObjects.assistant.openAssistant();

    // Create two conversations from the UI (needed for profile_uid linkage)
    await pageObjects.assistant.createAndTitleConversation(
      'Lucky title',
      azureConnectorPayload.name
    );
    await pageObjects.assistant.resetConversation();
    await pageObjects.assistant.createAndTitleConversation(
      'Lovely title',
      azureConnectorPayload.name
    );
    await pageObjects.assistant.resetConversation();

    // Create system prompt assigned to both conversations
    await pageObjects.assistant.createSystemPrompt(testPrompt.name, testPrompt.content, [
      'Lucky title',
      'Lovely title',
    ]);
    await pageObjects.assistant.assertSystemPromptSelected(testPrompt.name);
    await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
    await pageObjects.assistant.assertConnectorSelected(azureConnectorPayload.name);
    await pageObjects.assistant.typeAndSendMessage('hello');
    await pageObjects.assistant.assertSystemPromptSent(testPrompt.content);
    await pageObjects.assistant.assertMessageSent('hello', true);
    await pageObjects.assistant.assertErrorResponse();

    // Switch to the other conversation and verify prompt is set
    await pageObjects.assistant.selectConversation('Lucky title');
    await pageObjects.assistant.assertSystemPromptSelected(testPrompt.name);
    await pageObjects.assistant.typeAndSendMessage('hello');
    await pageObjects.assistant.assertSystemPromptSent(testPrompt.content);
    await pageObjects.assistant.assertMessageSent('hello', true);
    await pageObjects.assistant.assertErrorResponse();
  });
});
