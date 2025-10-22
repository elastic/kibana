/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, spaceTest, TIMEOUTS } from '@kbn/scout-security';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { RULE_MANAGEMENT_CONTEXT_DESCRIPTION } from '../../../../../public/detection_engine/common/translations';

spaceTest.describe('AI Assistant Conversations', { tag: ['@ess', '@svlSecurity'] }, () => {
  // On serverless we provide default .inference `Elastic LLM` connector
  spaceTest.describe('No connectors or conversations exist', { tag: ['@ess'] }, () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();
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
  });

  spaceTest.describe(
    'When no conversations exist but connectors do exist, show empty convo',
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

          // Navigate to rules management table
          await page.gotoApp('security', { path: '/rules/management' });

          // Wait for URL to change to rules page
          await page.waitForURL('**/app/security/rules/management**');

          // Dismiss onboarding modal if present
          await page
            .getByRole('button', { name: 'Close tour' })
            .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
            .catch(() => {});

          // Wait for the rules table to load
          // await page.testSubj.locator('allRulesTable').waitFor({ state: 'visible' });

          // Select the rule using its checkbox (using the rule ID from the API response)
          const ruleCheckbox = page.testSubj.locator(`checkboxSelectRow-${createdRule.id}`);
          await ruleCheckbox.waitFor({ state: 'visible' });
          await ruleCheckbox.click();

          // Open assistant from rule context
          await pageObjects.assistantPage.openFromRule();

          await pageObjects.assistantPage.expectConversationTitle(`Detection Rules - ${ruleName}`);
          await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
          await pageObjects.assistantPage.expectPromptContext(
            0,
            RULE_MANAGEMENT_CONTEXT_DESCRIPTION
          );
        }
      );

      spaceTest(
        'When invoked from alert details',
        async ({ page, pageObjects, apiServices, scoutSpace }) => {
          const ruleName = `New Rule Test_${scoutSpace.id}_${Date.now()}`;
          const rule = {
            ...CUSTOM_QUERY_RULE,
            name: ruleName,
            from: 'now-1m',
          };

          await apiServices.detectionRule.createCustomQueryRule(rule);

          // Generate test data to trigger alert
          await apiServices.detectionRule.indexTestDocument('logs-test', {
            'event.category': 'security',
            'event.type': 'alert',
            message: 'Test security event for detection rule',
            'host.name': 'test-host',
            'user.name': 'test-user',
          });

          // Navigate to alerts page
          await page.gotoApp('security', { path: '/alerts' });

          // Wait for URL to change to alerts page
          await page.waitForURL('**/app/security/alerts**');

          // Dismiss onboarding modal if present
          await page
            .getByRole('button', { name: 'Close tour' })
            .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
            .catch(() => {});

          // Wait for alerts to load (rule execution + indexing)
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

  spaceTest.describe.serial('Changing conversations', () => {
    let azureConnectorName: string;
    let bedrockConnectorName: string;
    let mockConvo1Title: string;
    let mockConvo2Title: string;

    spaceTest.beforeEach(async ({ browserAuth, apiServices, browserScopedApis, scoutSpace }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();
      await apiServices.detectionRule.deleteAll();

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
    });

    spaceTest(
      'Last conversation persists in memory from page to page',
      async ({ page, pageObjects, apiServices, scoutSpace }) => {
        const ruleName = `New Rule Test_${scoutSpace.id}_${Date.now()}`;
        const rule = {
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          from: 'now-1m',
        };

        await apiServices.detectionRule.createCustomQueryRule(rule);

        // Generate test data to trigger alert
        await apiServices.detectionRule.indexTestDocument('logs-test', {
          'event.category': 'security',
          'event.type': 'alert',
          message: 'Test security event for detection rule',
          'host.name': 'test-host',
          'user.name': 'test-user',
        });

        // Navigate to alerts page
        await page.gotoApp('security', { path: '/alerts' });

        // Wait for URL to change to alerts page
        await page.waitForURL('**/app/security/alerts**');

        // Dismiss onboarding modal if present
        await pageObjects.securityCommon.dismissOnboardingModal();

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
      async ({ page, pageObjects }) => {
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
        await pageObjects.assistantPage.expectConnectorSelected(azureConnectorName);
        await pageObjects.assistantPage.expectMessageSent('hello');

        // Switch back to second conversation - should retain state
        await pageObjects.assistantPage.selectConversation(mockConvo2Title);
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
  });
});
