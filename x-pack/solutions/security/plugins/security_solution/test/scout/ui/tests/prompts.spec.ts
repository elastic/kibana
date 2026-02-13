/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../fixtures';
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

test.describe(
  'AI Assistant System Prompts',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deletePrompts(esClient);
      await createAzureConnector(kbnClient);
      await createConversation(kbnClient, mockConvo1);
      await createConversation(kbnClient, mockConvo2);
      await createPromptsBulk(kbnClient, [customPrompt2, customPrompt1]);
    });

    test.afterEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deletePrompts(esClient);
    });

    test('No prompt is selected by default, custom prompts can be selected and deselected', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await expect(pageObjects.assistant.systemPrompt).toHaveText('Select a system prompt');
      await pageObjects.assistant.selectSystemPrompt(customPrompt2.name);
      await pageObjects.assistant.selectSystemPrompt(customPrompt1.name);
      await pageObjects.assistant.clearSystemPrompt();
      await expect(pageObjects.assistant.systemPrompt).toHaveText('Select a system prompt');
    });

    test('Deselecting a system prompt prevents prompt from being sent', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await test.step('select and deselect system prompt', async () => {
        await pageObjects.assistant.selectSystemPrompt(customPrompt2.name);
        await pageObjects.assistant.clearSystemPrompt();
        await expect(pageObjects.assistant.systemPrompt).toHaveText('Select a system prompt');
      });

      await test.step('send message and verify no system prompt sent', async () => {
        await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
        await pageObjects.assistant.typeAndSendMessage('hello');
        await expect(pageObjects.assistant.messageAt(0)).toContainText('hello');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });

      await test.step('reset and verify prompt stays clear', async () => {
        await pageObjects.assistant.resetConversation();
        await expect(pageObjects.assistant.systemPrompt).toHaveText('Select a system prompt');
        await pageObjects.assistant.typeAndSendMessage('hello');
        await expect(pageObjects.assistant.messageAt(0)).toContainText('hello');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });
    });

    // Skipped in Cypress as well - fails on CI
    test.skip('Last selected system prompt persists in conversation', async () => {
      // Placeholder - skipped in original Cypress test
    });

    test('Add prompt from system prompt selector without setting a default conversation', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await test.step('create prompt and verify not auto-selected', async () => {
        await pageObjects.assistant.createSystemPrompt(testPrompt.name, testPrompt.content);
        await expect(pageObjects.assistant.systemPrompt).toHaveText('Select a system prompt');
      });

      await test.step('select prompt, send message, verify system prompt sent first', async () => {
        await pageObjects.assistant.selectSystemPrompt(testPrompt.name);
        await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
        await pageObjects.assistant.typeAndSendMessage('hello');
        await expect(pageObjects.assistant.messageAt(0)).toContainText(testPrompt.content);
        await expect(pageObjects.assistant.messageAt(1)).toContainText('hello');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });
    });

    test('Add prompt and set multiple conversations as default', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get('/app/security/get_started'));
      await waitForPageReady(page);
      await pageObjects.assistant.openAssistant();

      await test.step('create conversations from UI', async () => {
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
      });

      await test.step(
        'create system prompt assigned to both conversations',
        async () => {
          await pageObjects.assistant.createSystemPrompt(testPrompt.name, testPrompt.content, [
            'Lucky title',
            'Lovely title',
          ]);
          await expect(pageObjects.assistant.systemPrompt).toHaveText(testPrompt.name);
          await pageObjects.assistant.selectConnector(azureConnectorPayload.name);
          await pageObjects.assistant.typeAndSendMessage('hello');
          await expect(pageObjects.assistant.messageAt(0)).toContainText(testPrompt.content);
          await expect(pageObjects.assistant.messageAt(1)).toContainText('hello');
          await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
        }
      );

      await test.step('switch to other conversation and verify prompt is set', async () => {
        await pageObjects.assistant.selectConversation('Lucky title');
        await expect(pageObjects.assistant.systemPrompt).toHaveText(testPrompt.name);
        await pageObjects.assistant.typeAndSendMessage('hello');
        await expect(pageObjects.assistant.messageAt(0)).toContainText(testPrompt.content);
        await expect(pageObjects.assistant.messageAt(1)).toContainText('hello');
        await expect(pageObjects.assistant.errorComment).toBeVisible({ timeout: 30_000 });
      });
    });
  }
);
