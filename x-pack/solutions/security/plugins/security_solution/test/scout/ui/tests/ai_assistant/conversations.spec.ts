/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { RULE_MANAGEMENT_CONTEXT_DESCRIPTION } from '../../../../../public/detection_engine/common/translations';

// On serverless we provide default .inference `Elastic LLM` connector
spaceTest.describe(
  'AI Assistant Conversations - No connectors or conversations exist',
  { tag: ['@ess'] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
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
        await pageObjects.assistantPage.expectNewConversation(true, 'New chat');
      }
    );

    spaceTest(
      'Creating a new connector from welcome setup automatically sets the connector for the conversation',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create OpenAI connector through the UI
        await pageObjects.assistantPage.createOpenAIConnector('My OpenAI Connector');
        await pageObjects.assistantPage.expectConnectorSelected('My OpenAI Connector');
      }
    );
  }
);

spaceTest.describe(
  'AI Assistant Conversations - When no conversations exist but connectors do exist, show empty convo',
  { tag: ['@ess', '@svlSecurity'] },
  () => {
    let azureConnectorName: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
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

      await pageObjects.assistantPage.expectNewConversation(false, 'New chat');
      await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
      await pageObjects.assistantPage.expectUserPromptEmpty();
    });

    spaceTest(
      'When invoked from rules page',
      async ({ page, pageObjects, apiServices, scoutSpace }) => {
        const ruleName = `Rule 1_${scoutSpace.id}_${Date.now()}`;
        const rule = {
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          rule_id: `rule1_${scoutSpace.id}`,
          enabled: true,
        };

        const createdRule = await apiServices.detectionRule.createCustomQueryRule(rule);

        // Navigate to rules management page using page object
        await pageObjects.rulesManagementPage.navigateAndDismissOnboarding();

        // Select the rule using its checkbox
        await pageObjects.rulesManagementPage.selectRuleByCheckbox(createdRule.id);

        // Open assistant from rule context
        await pageObjects.assistantPage.openFromRule();

        await pageObjects.assistantPage.expectConversationTitle(`Detection Rules - ${ruleName}`);
        await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.expectPromptContext(0, RULE_MANAGEMENT_CONTEXT_DESCRIPTION);
      }
    );

    spaceTest(
      'When invoked from alert details',
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

        await apiServices.detectionRule.createCustomQueryRule(rule);

        // Navigate to alerts page using page object
        await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

        // Wait for rule to execute and alert to be generated
        await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

        // Expand the first alert
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

        // Open assistant from alert context
        await pageObjects.assistantPage.openFromAlert();

        await pageObjects.assistantPage.expectConversationTitleContains('New Rule Test');
        await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.expectPromptContext(0, 'Alert (from summary)');
      }
    );

    spaceTest(
      'Shows empty connector callout when a conversation that had a connector no longer does',
      async ({ page, pageObjects, browserScopedApis, apiServices }) => {
        // Create conversation with connector reference using browser-scoped API
        const mockConvo = await browserScopedApis.assistant.createConversation({
          title: 'Spooky convo',
          messages: [],
        });

        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Select the conversation
        await pageObjects.assistantPage.selectConversation(mockConvo.title);

        // Should show missing connector callout
        await expect(pageObjects.assistantPage.connectorMissingCallout).toBeVisible();
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

        await apiServices.detectionRule.createCustomQueryRule(rule);

        // Navigate to alerts page using page object
        await pageObjects.alertsTablePage.navigateAndDismissOnboarding();

        // Wait for the rule to execute and alert to be generated
        await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper(ruleName);

        // Expand alert
        await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);

        // Open assistant from alert context
        await pageObjects.assistantPage.openFromAlert();
        await pageObjects.assistantPage.expectConversationTitleContains('New Rule Test');

        // Send a message to ensure conversation is created
        await pageObjects.assistantPage.submitMessage();

        // Close assistant and navigate to different page
        await pageObjects.assistantPage.close();
        await page.gotoApp('security', { path: '/get_started' });

        // Open assistant again - should show last conversation
        await pageObjects.assistantPage.open();
        await pageObjects.assistantPage.expectConversationTitleContains('New Rule Test');
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
        await pageObjects.assistantPage.selectConversation(mockConvo1Title);
        await pageObjects.assistantPage.selectConnector(azureConnectorName);
        await pageObjects.assistantPage.typeAndSendMessage('hello');
        await pageObjects.assistantPage.expectMessageSent('hello');
        await pageObjects.assistantPage.expectErrorResponse();

        // Select second conversation and send message
        await pageObjects.assistantPage.selectConversation(mockConvo2Title);
        await pageObjects.assistantPage.selectConnector(bedrockConnectorName);
        await pageObjects.assistantPage.typeAndSendMessage('goodbye');
        await pageObjects.assistantPage.expectMessageSent('goodbye');
        await pageObjects.assistantPage.expectErrorResponse();

        // Switch back to first conversation - should retain state
        await pageObjects.assistantPage.selectConversation(mockConvo1Title);
        // Wait for conversation to fully load before checking state
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
          // Ignore timeout - network might not be idle, continue anyway
        });
        await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.expectMessageSent('hello');

        // Switch back to second conversation - should retain state
        await pageObjects.assistantPage.selectConversation(mockConvo2Title);
        // Wait for conversation to fully load before checking state
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
          // Ignore timeout - network might not be idle, continue anyway
        });
        await pageObjects.assistantPage.expectConnectorSelected(bedrockConnectorName);
        await pageObjects.assistantPage.expectMessageSent('goodbye');
      }
    );

    spaceTest(
      'Correctly creates and titles new conversations, and allows title updates',
      async ({ page, pageObjects }) => {
        await page.gotoApp('security', { path: '/get_started' });
        await pageObjects.assistantPage.open();

        // Create and title a new conversation
        await pageObjects.assistantPage.createAndTitleConversation('Something else');
      }
    );
  }
);
