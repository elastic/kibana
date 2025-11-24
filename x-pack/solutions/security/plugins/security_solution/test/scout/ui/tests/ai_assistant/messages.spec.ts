/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageRole } from '@kbn/elastic-assistant-common';
import { expect, spaceTest } from '@kbn/scout-security';

spaceTest.describe('AI Assistant Messages', { tag: ['@ess', '@svlSecurity'] }, () => {
  const mockTimelineQuery = 'host.risk.keyword: "high"';
  const mockConvo = {
    id: 'spooky',
    title: 'Spooky convo',
    messages: [
      {
        timestamp: '2024-08-15T18:30:37.873Z',
        content:
          'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\n\nGive a query I can run in the timeline',
        role: 'user' as MessageRole,
      },
      {
        timestamp: '2024-08-15T18:31:24.008Z',
        content: `To query events from a high-risk host in the Elastic Security timeline, you can use the following KQL query:\n\n\`\`\`kql\n${mockTimelineQuery}\n\`\`\``,
        role: 'assistant' as MessageRole,
        traceData: {
          traceId: '74d2fac29753adebd5c479e3d9e45da3',
          transactionId: 'e13d97d138b8a13c',
        },
      },
    ],
  };

  spaceTest.beforeEach(
    async ({ apiServices, browserAuth, browserScopedApis, page, config, scoutSpace }) => {
      // Login - use admin on serverless to match Cypress behavior, otherwise ESS default
      if (config.serverless) {
        await browserAuth.loginAsAdmin();
      } else {
        // On ESS, login as admin to match the authenticated user
        await browserAuth.loginAs('admin');
      }

      // Clean up existing data using worker-scoped services (OK for delete operations)
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.assistant.deleteAllPrompts();

      // Navigate to Security Get Started page
      await page.gotoApp('security/get_started');

      // Create test connector (global resource, can use worker-scoped service)
      const connector = await apiServices.connectors.createAzureOpenAI();

      // Create conversation using browser-scoped API service
      // This ensures the conversation is created with the logged-in browser user's context
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo.id}_${scoutSpace.id}`,
        title: mockConvo.title,
        excludeFromLastConversationStorage: false,
        messages: mockConvo.messages,
        replacements: {},
        category: 'assistant',
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: connector.id,
          defaultSystemPromptId: 'default-system-prompt',
          model: 'test-model',
          provider: 'Azure OpenAI',
        },
      });

      // Reload the page to ensure conversation list UI is refreshed
      await page.reload();

      // Wait for page to be fully loaded after reload
      await page.waitForLoadState('domcontentloaded');
    }
  );

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.connectors.deleteAll();
    await apiServices.assistant.deleteAllConversations();
    await apiServices.assistant.deleteAllPrompts();
  });

  spaceTest(
    'A message with a kql query can be used in the timeline only from pages with timeline',
    async ({ pageObjects, page }) => {
      const { assistantPage } = pageObjects;

      // Open assistant from Get Started page
      await assistantPage.open();

      // Select the conversation with the KQL query
      await assistantPage.conversations.selectConversation(mockConvo.title);

      // Verify "Send to Timeline" button is disabled on Get Started page
      await expect(assistantPage.locators.sendToTimelineButton).toBeDisabled();

      // Navigate to Cases page (which has timeline)
      await page.gotoApp('security/cases');

      // Wait for URL to change to cases page
      await page.waitForURL('**/app/security/cases**');

      // Dismiss onboarding modal if present
      await pageObjects.securityCommon.dismissOnboardingModal();

      // Open assistant again
      await assistantPage.open();

      // Send the query to timeline
      await assistantPage.messaging.sendQueryToTimeline();

      // Verify the timeline query is populated with the expected query
      await pageObjects.timelinePage.assertions.expectQueryText(mockTimelineQuery);
    }
  );
});
