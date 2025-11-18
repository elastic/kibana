/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest, TIMEOUTS } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { RULE_MANAGEMENT_CONTEXT_DESCRIPTION } from '../../../../../public/detection_engine/common/translations';

// On serverless we provide default .inference `Elastic LLM` connector
spaceTest.describe(
  'AI Assistant Conversations - No connectors or conversations exist',
  { tag: ['@ess'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace: _scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionRule.deleteAllAlerts();
      await apiServices.detectionRule.cleanupTestData('logs-*');
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionRule.deleteAllAlerts();
      await apiServices.detectionRule.cleanupTestData('logs-*');
    });

    spaceTest(
      'Shows welcome setup when no connectors or conversations exist',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();
        await pageObjects.assistantPage.assertions.expectNewConversation(true, 'New chat');
      }
    );

    spaceTest(
      'Creating a new connector from welcome setup automatically sets the connector for the conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create OpenAI connector through the UI
        await pageObjects.assistantPage.connectors.createOpenAIConnector('My OpenAI Connector');
        await pageObjects.assistantPage.assertions.expectConnectorSelected('My OpenAI Connector');
      }
    );
  }
);

spaceTest.describe(
  'AI Assistant Conversations - When no conversations exist but connectors do exist, show empty convo',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    let azureConnectorName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace: _scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();

      // Create Azure connector
      const connector = await apiServices.connectors.createAzureOpenAI();
      azureConnectorName = connector.name;
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionRule.deleteAllAlerts();
      await apiServices.detectionRule.cleanupTestData('logs-*');
    });

    spaceTest('When invoked on AI Assistant click', async ({ page, pageObjects }) => {
      await page.gotoApp('security', { path: '/get_started' });
      await pageObjects.assistantPage.open();

      await pageObjects.assistantPage.assertions.expectNewConversation(false, 'New chat');
      await pageObjects.assistantPage.assertions.expectConnectorSelected(azureConnectorName);
      await pageObjects.assistantPage.assertions.expectUserPromptEmpty();
    });

    spaceTest(
      'When invoked from rules page',
      async ({ page: _page, pageObjects, apiServices, scoutSpace }) => {
        const ruleName = `Rule 1_${scoutSpace.id}_${Date.now()}`;
        const rule = {
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          rule_id: `rule1_${scoutSpace.id}`,
          enabled: true,
        };

        const createdRule = await apiServices.detectionRule.createCustomQueryRule(rule);

        // Navigate to rules management page using page object
        await pageObjects.rulesManagementPage.navigation.navigateAndDismissOnboarding();

        // Select the rule using its checkbox
        await pageObjects.rulesManagementPage.selection.selectRuleByCheckbox(createdRule.id);

        // Open assistant from rule context
        await pageObjects.assistantPage.openFromRule();

        await pageObjects.assistantPage.assertions.expectConversationTitle(
          `Detection Rules - ${ruleName}`
        );
        await pageObjects.assistantPage.assertions.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.assertions.expectPromptContext(
          0,
          RULE_MANAGEMENT_CONTEXT_DESCRIPTION
        );
      }
    );

    spaceTest(
      'When invoked from alert details',
      async ({ page: _page, pageObjects, apiServices, scoutSpace }) => {
        const ruleName = `New Rule Test_${scoutSpace.id}_${Date.now()}`;

        // Generate test data FIRST before creating the rule
        await apiServices.detectionRule.indexTestDocument('logs-test', {
          'event.category': 'security',
          'event.type': 'alert',
          message: 'Test security event for detection rule',
          'host.name': 'test-host',
          'user.name': 'test-user',
        });

        // Create rule that will match the already-indexed document
        const rule = {
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          from: 'now-1m',
          enabled: true,
        };

        const createdRule = await apiServices.detectionRule.createCustomQueryRule(rule);

        // Wait for the rule to execute before checking for alerts
        await apiServices.detectionRule.waitForRuleExecution(createdRule.rule_id);

        // Navigate to alerts page using page object
        await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

        // Wait for alerts table to load and then for the rule name to appear in alerts-by-rule table
        await pageObjects.alertsTablePage.waitForAlertsToLoad();
        await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

        // Expand the first alert
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

        // Open assistant from alert context
        await pageObjects.assistantPage.openFromAlert();

        await pageObjects.assistantPage.assertions.expectConversationTitleContains('New Rule Test');
        await pageObjects.assistantPage.assertions.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.assertions.expectPromptContext(0, 'Alert (from summary)');
      }
    );

    spaceTest(
      'Shows empty connector callout when a conversation that had a connector no longer does',
      async ({ page, pageObjects, browserScopedApis, apiServices: _apiServices, scoutSpace }) => {
        // Create conversation with connector reference using browser-scoped API
        // Use unique title to avoid conflicts with other tests
        const conversationTitle = `Spooky convo_${scoutSpace.id}_${Date.now()}`;
        const mockConvo = await browserScopedApis.assistant.createConversation({
          title: conversationTitle,
          messages: [],
        });

        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Select the conversation
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo.title);

        // Should show missing connector callout
        await expect(pageObjects.assistantPage.locators.connectorMissingCallout).toBeVisible();
      }
    );
  }
);

spaceTest.describe.serial(
  'AI Assistant Conversations - Changing conversations',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    let azureConnectorName: string;
    let bedrockConnectorName: string;
    let mockConvo1Title: string;
    let mockConvo2Title: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, browserScopedApis, scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionRule.deleteAllAlerts();
      await apiServices.detectionRule.cleanupTestData('logs-*');

      // Create connectors
      const azureConnector = await apiServices.connectors.createAzureOpenAI();
      azureConnectorName = azureConnector.name;

      const bedrockConnector = await apiServices.connectors.createBedrock();
      bedrockConnectorName = bedrockConnector.name;

      // Create mock conversations using browser-scoped API
      mockConvo1Title = `Spooky convo_${scoutSpace.id}_${Date.now()}`;
      mockConvo2Title = `Silly convo_${scoutSpace.id}_${Date.now()}`;

      await browserScopedApis.assistant.createConversation({
        title: mockConvo1Title,
        messages: [],
      });

      await browserScopedApis.assistant.createConversation({
        title: mockConvo2Title,
        messages: [],
      });
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionRule.deleteAllAlerts();
      await apiServices.detectionRule.cleanupTestData('logs-*');
    });

    spaceTest(
      'Last conversation persists in memory from page to page',
      async ({ page, pageObjects, apiServices, scoutSpace }) => {
        const ruleName = `New Rule Test_${scoutSpace.id}_${Date.now()}`;

        // Generate test data FIRST before creating the rule
        await apiServices.detectionRule.indexTestDocument('logs-test', {
          'event.category': 'security',
          'event.type': 'alert',
          message: 'Test security event for detection rule',
          'host.name': 'test-host',
          'user.name': 'test-user',
        });

        // Create rule that will match the already-indexed document
        const rule = {
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          from: 'now-1m',
          enabled: true,
        };

        const createdRule = await apiServices.detectionRule.createCustomQueryRule(rule);

        // Wait for the rule to execute before checking for alerts
        await apiServices.detectionRule.waitForRuleExecution(createdRule.rule_id);

        // Navigate to alerts page using page object
        await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

        // Wait for alerts table to load and then for the rule name to appear in alerts-by-rule table
        await pageObjects.alertsTablePage.waitForAlertsToLoad();
        await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

        // Expand alert
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

        // Open assistant from alert context
        await pageObjects.assistantPage.openFromAlert();
        await pageObjects.assistantPage.assertions.expectConversationTitleContains('New Rule Test');

        // Send a message to ensure conversation is created
        await pageObjects.assistantPage.messaging.submitMessage();

        // Close assistant and alert flyout before navigating to different page
        await pageObjects.assistantPage.close();
        await pageObjects.alertsTablePage.closeAlertFlyout();
        await page.gotoApp('security', { path: '/get_started' });

        // Open assistant again - should show last conversation
        await pageObjects.assistantPage.open();
        await pageObjects.assistantPage.assertions.expectConversationTitleContains('New Rule Test');

        // Close assistant before test ends to ensure clean state for afterEach cleanup
        await pageObjects.assistantPage.close();
      }
    );

    spaceTest(
      'Properly switches back and forth between conversations',
      async ({ page, pageObjects }, testInfo) => {
        // Increase timeout for this test - multiple AI responses in serverless can be slow
        testInfo.setTimeout(120000); // 2 minutes

        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Select first conversation and send message
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo1Title);
        await pageObjects.assistantPage.connectors.selectConnector(azureConnectorName);
        await pageObjects.assistantPage.messaging.typeAndSendMessage('hello');
        await pageObjects.assistantPage.assertions.expectMessageSent('hello');
        await pageObjects.assistantPage.assertions.expectErrorResponse();

        // Select second conversation and send message
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo2Title);
        await pageObjects.assistantPage.connectors.selectConnector(bedrockConnectorName);
        await pageObjects.assistantPage.messaging.typeAndSendMessage('goodbye');
        await pageObjects.assistantPage.assertions.expectMessageSent('goodbye');
        await pageObjects.assistantPage.assertions.expectErrorResponse();

        // Switch back to first conversation - should retain state
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo1Title);
        // Wait for conversation to fully load before checking state
        // Wait for connector selector to be visible as an indicator that conversation has loaded
        await pageObjects.assistantPage.locators.connectorSelector
          .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
          .catch(() => {
            // Ignore timeout - continue anyway
          });
        await pageObjects.assistantPage.assertions.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.assertions.expectMessageSent('hello');

        // Switch back to second conversation - should retain state
        await pageObjects.assistantPage.conversations.selectConversation(mockConvo2Title);
        // Wait for conversation to fully load before checking state
        // Wait for connector selector to be visible as an indicator that conversation has loaded
        await pageObjects.assistantPage.locators.connectorSelector
          .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
          .catch(() => {
            // Ignore timeout - continue anyway
          });
        await pageObjects.assistantPage.assertions.expectConnectorSelected(bedrockConnectorName);
        await pageObjects.assistantPage.assertions.expectMessageSent('goodbye');
      }
    );

    spaceTest(
      'Correctly creates and titles new conversations, and allows title updates',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create and title a new conversation
        await pageObjects.assistantPage.conversations.createAndTitleConversation('Something else');
      }
    );
  }
);
