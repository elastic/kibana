/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout-security';
import type { PromptCreateProps } from '@kbn/elastic-assistant-common/impl/schemas';

const testPrompt = {
  name: 'Cool prompt',
  content: 'This is a super cool prompt.',
};

const promptType: PromptCreateProps['promptType'] = 'system';

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

const mockConvo1 = {
  id: 'spooky',
  title: 'Spooky convo',
};

const mockConvo2 = {
  id: 'silly',
  title: 'Silly convo',
};

spaceTest.describe(
  'AI Assistant Prompts - System Prompts',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, browserScopedApis, scoutSpace }) => {
      // Login
      await browserAuth.loginAsAdmin();

      // Clean up existing data
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.assistant.deleteAllPrompts();

      // Create test connector
      await apiServices.connectors.createAzureOpenAI();

      // Create mock conversations with unique IDs using browser-scoped API
      const timestamp = Date.now();
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo1.id}-${scoutSpace.id}-${timestamp}`,
        title: mockConvo1.title,
      });
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo2.id}-${scoutSpace.id}-${timestamp}`,
        title: mockConvo2.title,
      });

      // Create custom system prompts using browser-scoped API
      await browserScopedApis.assistant.createPrompts([customPrompt2, customPrompt1]);
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.assistant.deleteAllPrompts();
    });

    spaceTest(
      'No prompt is selected by default, custom prompts can be selected and deselected',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Assert no prompt is selected by default
        await pageObjects.assistantPage.assertions.expectEmptySystemPrompt();

        // Select custom prompt 2
        await pageObjects.assistantPage.prompts.selectSystemPrompt(customPrompt2.name);
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(customPrompt2.name);

        // Select custom prompt 1
        await pageObjects.assistantPage.prompts.selectSystemPrompt(customPrompt1.name);
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(customPrompt1.name);

        // Clear the system prompt
        await pageObjects.assistantPage.prompts.clearSystemPrompt();
        await pageObjects.assistantPage.assertions.expectEmptySystemPrompt();
      }
    );

    spaceTest(
      'Deselecting a system prompt prevents prompt from being sent. When conversation is then cleared, the prompt remains cleared.',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Select a system prompt
        await pageObjects.assistantPage.prompts.selectSystemPrompt(customPrompt2.name);

        // Clear the system prompt
        await pageObjects.assistantPage.prompts.clearSystemPrompt();

        // Send a message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert message was sent without system prompt
        await pageObjects.assistantPage.assertions.expectMessageSent('hello');

        // Wait for error response (expected in test environment)
        await pageObjects.assistantPage.assertions.expectErrorResponse();

        // Reset the conversation
        await pageObjects.assistantPage.conversations.resetConversation();

        // Verify system prompt is still empty
        await pageObjects.assistantPage.assertions.expectEmptySystemPrompt();

        // Send another message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert message was sent
        await pageObjects.assistantPage.assertions.expectMessageSent('hello');

        // Wait for error response
        await pageObjects.assistantPage.assertions.expectErrorResponse();
      }
    );

    // Skipping this test as it fails on CI (same as Cypress)
    spaceTest.skip(
      'Last selected system prompt persists in conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Select first conversation
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo1.title);

        // Select the Azure connector
        await pageObjects.assistantPage.connectors.selectConnector(
          'Azure OpenAI Scout test connector'
        );

        // Select a system prompt
        await pageObjects.assistantPage.prompts.selectSystemPrompt(customPrompt2.name);

        // Send a message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert system prompt was sent
        await pageObjects.assistantPage.assertions.expectSystemPromptSent(customPrompt2.content);

        // Assert message was sent after system prompt
        await pageObjects.assistantPage.assertions.expectMessageSent('hello', true);

        // Wait for error response
        await pageObjects.assistantPage.assertions.expectErrorResponse();

        // Reset the conversation
        await pageObjects.assistantPage.conversations.resetConversation();

        // Verify system prompt persists
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(customPrompt2.name);

        // Switch to second conversation
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo2.title);

        // Verify no system prompt is selected
        await pageObjects.assistantPage.assertions.expectEmptySystemPrompt();

        // Switch back to first conversation
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo1.title);

        // Verify system prompt is still selected
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(customPrompt2.name);
      }
    );

    spaceTest(
      'Add prompt from system prompt selector without setting a default conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create a system prompt without setting default conversations
        await pageObjects.assistantPage.prompts.createSystemPrompt(
          testPrompt.name,
          testPrompt.content
        );

        // Verify the prompt is not automatically selected (no default conversation was set)
        await pageObjects.assistantPage.assertions.expectEmptySystemPrompt();

        // Manually select the created prompt
        await pageObjects.assistantPage.prompts.selectSystemPrompt(testPrompt.name);
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(testPrompt.name);

        // Send a message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert system prompt was sent
        await pageObjects.assistantPage.assertions.expectSystemPromptSent(testPrompt.content);

        // Assert message was sent after system prompt
        await pageObjects.assistantPage.assertions.expectMessageSent('hello', true);

        // Wait for error response
        await pageObjects.assistantPage.assertions.expectErrorResponse();
      }
    );

    // It is failing because when try to reset the second conversation, the conversation that is being reset is the first one.
    spaceTest.skip(
      'Add prompt from system prompt selector and set multiple conversations (including current) as default conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create first titled conversation
        await pageObjects.assistantPage.conversations.createAndTitleConversation('Lucky title');
        await pageObjects.assistantPage.conversations.resetConversation();

        // Create second titled conversation
        await pageObjects.assistantPage.conversations.createAndTitleConversation('Lovely title');
        await pageObjects.assistantPage.conversations.resetConversation();

        // Current conversation is 'Lovely title'
        // Create system prompt and set it as default for both conversations
        await pageObjects.assistantPage.prompts.createSystemPrompt(
          testPrompt.name,
          testPrompt.content,
          ['Lucky title', 'Lovely title']
        );

        // Verify the prompt is automatically selected (current conversation is in default list)
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(testPrompt.name);

        // Send a message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert system prompt was sent
        await pageObjects.assistantPage.assertions.expectSystemPromptSent(testPrompt.content);

        // Assert message was sent after system prompt
        await pageObjects.assistantPage.assertions.expectMessageSent('hello', true);

        // Wait for error response before switching conversations
        await pageObjects.assistantPage.assertions.expectErrorResponse();

        // Switch to 'Lucky title' conversation
        await pageObjects.assistantPage.conversations.selectConversation('Lucky title');

        // Verify the prompt is also selected in this conversation
        await pageObjects.assistantPage.assertions.expectSystemPromptSelected(testPrompt.name);

        // Send another message
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');

        // Assert system prompt was sent
        await pageObjects.assistantPage.assertions.expectSystemPromptSent(testPrompt.content);

        // Assert message was sent after system prompt
        await pageObjects.assistantPage.assertions.expectMessageSent('hello', true);

        // Wait for error response
        await pageObjects.assistantPage.assertions.expectErrorResponse();
      }
    );
  }
);

spaceTest.describe(
  'AI Assistant Prompts - Quick Prompts',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, browserScopedApis, scoutSpace }) => {
      // Login
      await browserAuth.loginAsAdmin();

      // Clean up existing data
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.assistant.deleteAllPrompts();

      // Create test connector
      await apiServices.connectors.createAzureOpenAI();

      // Create mock conversations with unique IDs using browser-scoped API
      const timestamp = Date.now();
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo1.id}-${scoutSpace.id}-${timestamp}`,
        title: mockConvo1.title,
      });
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo2.id}-${scoutSpace.id}-${timestamp}`,
        title: mockConvo2.title,
      });
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.assistant.deleteAllPrompts();
    });

    spaceTest(
      'Add a quick prompt and send it in the conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create a quick prompt
        await pageObjects.assistantPage.prompts.createQuickPrompt(
          testPrompt.name,
          testPrompt.content
        );

        // Verify quick prompt badge is visible
        await pageObjects.assistantPage.assertions.expectQuickPromptVisible(testPrompt.name);

        // Send the quick prompt
        await pageObjects.assistantPage.prompts.sendQuickPrompt(testPrompt.name);

        // Assert the prompt content was sent as a message
        await pageObjects.assistantPage.assertions.expectMessageSent(testPrompt.content);

        // Wait for error response
        await pageObjects.assistantPage.assertions.expectErrorResponse();
      }
    );

    spaceTest(
      'Add a quick prompt with context and it is only available in the selected context',
      async ({ page, pageObjects, apiServices, scoutSpace }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create a quick prompt with 'Alert (from view)' context
        await pageObjects.assistantPage.prompts.createQuickPrompt(
          testPrompt.name,
          testPrompt.content,
          ['Alert (from view)']
        );

        // Verify the quick prompt badge is NOT visible in the general context
        await pageObjects.assistantPage.assertions.expectQuickPromptNotVisible(testPrompt.name);

        // Create a detection rule to generate alerts
        const timestamp = Date.now();
        const ruleName = `Test Rule ${scoutSpace.id}_${timestamp}`;
        const ruleConfig = {
          type: 'query' as const,
          query: 'host.name: *',
          index: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
          name: ruleName,
          description: 'Test rule for quick prompt context',
          severity: 'high' as const,
          risk_score: 17,
          from: 'now-1m',
          enabled: true,
          rule_id: `test_rule_${scoutSpace.id}_${timestamp}`,
        };

        // Generate test data FIRST before creating the rule
        // Index a document that matches the rule query
        await apiServices.detectionRule.indexTestDocument('logs-test', {
          'event.category': 'security',
          'event.type': 'alert',
          message: 'Test security event for detection rule',
          'host.name': 'test-host',
          'user.name': 'test-user',
        });

        const createdRule = await apiServices.detectionRule.createCustomQueryRule(ruleConfig);

        // Wait for the rule to execute before checking for alerts
        await apiServices.detectionRule.waitForRuleExecution(createdRule.rule_id);

        // Navigate to alerts page using page object
        await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

        // Wait for alerts table to load and then for the rule name to appear in alerts-by-rule table
        await pageObjects.alertsTablePage.waitForAlertsToLoad();
        await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

        // Expand first alert if available
        await pageObjects.alertsTablePage.expandFirstAlert();

        // Open assistant from alert context
        await pageObjects.assistantPage.openFromAlert();

        // Verify the quick prompt badge IS visible in alert context
        await pageObjects.assistantPage.assertions.expectQuickPromptVisible(testPrompt.name);

        // Click the quick prompt badge
        await pageObjects.assistantPage.locators.quickPromptBadge(testPrompt.name).click();

        // Verify the prompt content is in the user prompt textarea
        await pageObjects.assistantPage.assertions.expectUserPromptText(testPrompt.content);
      }
    );

    // TODO: Delete quick prompt test
    // The Cypress test notes that deletion is difficult due to hidden CSS elements
    // This functionality should be added when the UI is improved
  }
);
