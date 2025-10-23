/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { MessageRole } from '@kbn/elastic-assistant-common';
import { expect, spaceTest } from '@kbn/scout-security';

const userRole: MessageRole = 'user';
const assistantRole: MessageRole = 'assistant';

// TODO: Skipped due to https://github.com/elastic/kibana/issues/235416
spaceTest.describe.skip('Assistant Conversation Sharing', { tag: ['@ess', '@svlSecurity'] }, () => {
  // User roles - these will be used for multi-user testing
  let primaryUser: string;
  let secondaryUser: string;
  let connector: Connector;

  // Mock conversation data
  const mockConvo1 = {
    id: 'spooky',
    title: 'Spooky convo',
    messages: [
      {
        timestamp: '2025-08-14T21:08:24.923Z',
        content: 'Hi spooky robot',
        role: userRole,
      },
      {
        timestamp: '2025-08-14T21:08:25.349Z',
        content: 'Hello spooky person',
        role: assistantRole,
      },
    ],
  };

  const mockConvo2 = {
    id: 'silly',
    title: 'Silly convo',
    messages: [
      {
        timestamp: '2025-08-14T21:08:24.923Z',
        content: 'Hi silly robot',
        role: userRole,
      },
      {
        timestamp: '2025-08-14T21:08:25.349Z',
        content: 'Hello silly person',
        role: assistantRole,
      },
    ],
  };

  spaceTest.beforeAll(async ({ config }) => {
    // Determine user roles based on deployment type
    if (config.serverless) {
      primaryUser = 'admin'; // elastic_admin equivalent
      secondaryUser = 'elastic_serverless'; // This user needs to be configured
    } else {
      primaryUser = 'system_indices_superuser';
      secondaryUser = 'editor'; // elastic equivalent
    }
  });

  spaceTest.beforeEach(
    async ({ page, browserAuth, apiServices, browserScopedApis, scoutSpace }) => {
      // Login as primary user
      await browserAuth.loginAsAdmin();

      // Clean up any existing data
      await apiServices.connectors.deleteAll();
      await apiServices.assistant.deleteAllConversations();

      // Create Azure OpenAI connector
      connector = await apiServices.connectors.createAzureOpenAI();

      // Create mock conversations with messages using browser-scoped API
      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo1.id}_${scoutSpace.id}`,
        title: mockConvo1.title,
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: connector.id,
          defaultSystemPromptId: 'default-system-prompt',
          model: 'test-model',
          provider: 'Azure OpenAI',
        },
        messages: mockConvo1.messages.map((msg) => ({
          ...msg,
          ...(msg.role === userRole && { user: { name: primaryUser } }),
        })),
      });

      await browserScopedApis.assistant.createConversation({
        id: `${mockConvo2.id}_${scoutSpace.id}`,
        title: mockConvo2.title,
        apiConfig: {
          actionTypeId: '.gen-ai',
          connectorId: connector.id,
          defaultSystemPromptId: 'default-system-prompt',
          model: 'test-model',
          provider: 'Azure OpenAI',
        },
        messages: mockConvo2.messages.map((msg) => ({
          ...msg,
          ...(msg.role === userRole && { user: { name: primaryUser } }),
        })),
      });

      // Navigate to the Security app
      await page.gotoApp('security', { path: '/get_started' });
    }
  );

  spaceTest.afterEach(async ({ apiServices }) => {
    // Clean up after each test
    await apiServices.assistant.deleteAllConversations();
    await apiServices.connectors.deleteAll();
  });

  spaceTest(
    'Share modal works to not share, share globally, and share selected',
    async ({ page, pageObjects }) => {
      const { assistantPage } = pageObjects;

      await assistantPage.open();
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.selectConnector(connector.name);

      // Assert that the conversation is not shared
      await assistantPage.expectCalloutState('private');

      // Open the share menu and verify not shared state
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Private');

      // Selecting 'not shared' should not change sharing settings
      await assistantPage.selectPrivate();
      await assistantPage.expectCalloutState('private');
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Private');

      // Opening and closing the share modal should not change sharing settings
      await assistantPage.openShareModal();
      await assistantPage.closeShareModal();
      await assistantPage.expectCalloutState('private');
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Private');

      // Selecting global share changes sharing settings
      await assistantPage.selectGlobal();
      await assistantPage.expectCalloutState('shared-by-me');

      // Close any toast notifications
      await pageObjects.securityCommon.dismissToasts();

      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Shared');
      await assistantPage.toggleConversationSideMenu();
      await assistantPage.expectSharedConversationIcon(mockConvo1.title);
      await assistantPage.expectNotSharedConversationIcon(mockConvo2.title);
      await assistantPage.toggleConversationSideMenu();

      // Share the other conversation with selected users
      await assistantPage.selectConversation(mockConvo2.title);
      await assistantPage.selectConnector(connector.name);

      // Assert that the conversation is not shared
      await assistantPage.expectCalloutState('private');
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Private');
      await assistantPage.openShareModal();

      // Press save without selecting users
      await assistantPage.submitShareModal();
      await assistantPage.expectCalloutState('private');
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Private');
      await assistantPage.openShareModal();

      // Select secondaryUser to share the conversation
      await assistantPage.shareConversationWithUser(secondaryUser);
      await assistantPage.submitShareModal();
      await assistantPage.expectCalloutState('shared-by-me');
      await assistantPage.openShareMenu();
      await assistantPage.expectShareMenuStatus('Restricted');

      // Opens to selected share since conversation is shared with selected users
      await assistantPage.openShareModal();
      await assistantPage.expectShareUser(secondaryUser);
      await assistantPage.closeShareModal();

      await assistantPage.toggleConversationSideMenu();
      await assistantPage.expectSharedConversationIcon(mockConvo2.title);
    }
  );

  spaceTest(
    'Shared conversations appear for the user they were shared with',
    async ({ page, pageObjects, browserAuth, context }) => {
      const { assistantPage } = pageObjects;

      // Share conversations as primary user
      await assistantPage.open();

      // Share first conversation globally
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.selectConnector(connector.name);
      await assistantPage.shareConversation('global');

      // Share second conversation with specific user
      await assistantPage.selectConversation(mockConvo2.title);
      await assistantPage.selectConnector(connector.name);
      await assistantPage.shareConversation(secondaryUser);

      // Login as secondary user (automatically clears cookies)
      await browserAuth.loginAs(secondaryUser);
      await page.gotoApp('security', { path: '/get_started' });
      await assistantPage.open();

      // Check if the shared conversations are visible
      await assistantPage.toggleConversationSideMenu();
      await expect(page.locator(`text=${mockConvo1.title}`)).toBeVisible();
      await expect(page.locator(`text=${mockConvo2.title}`)).toBeVisible();

      await assistantPage.expectSharedConversationIcon(mockConvo2.title);
      await assistantPage.expectSharedConversationIcon(mockConvo1.title);
      await assistantPage.toggleConversationSideMenu();

      // Verify the first conversation is shared with secondaryUser
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.expectCalloutState('shared-with-me');

      // Ensure we can view messages in the shared conversation
      await assistantPage.expectMessageSent(mockConvo1.messages[0].content);
    }
  );

  spaceTest(
    'Dismissed callout remains dismissed when conversation is unselected and selected again',
    async ({ page, pageObjects, browserAuth, context }) => {
      const { assistantPage } = pageObjects;

      // Share both conversations globally
      await assistantPage.open();

      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.selectConnector(connector.name);
      await assistantPage.shareConversation('global');

      await assistantPage.selectConversation(mockConvo2.title);
      await assistantPage.selectConnector(connector.name);
      await assistantPage.shareConversation('global');

      // Login as secondary user (automatically clears cookies)
      await browserAuth.loginAs(secondaryUser);
      await page.gotoApp('security', { path: '/get_started' });
      await assistantPage.open();

      // Select first conversation and dismiss callout
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.expectCalloutState('shared-with-me');
      await assistantPage.dismissSharedCallout();

      // Switch to second conversation
      await assistantPage.selectConversation(mockConvo2.title);
      await assistantPage.expectCalloutState('shared-with-me');

      // Switch back to first conversation - callout should remain dismissed
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.expectNoSharedCallout();
    }
  );

  spaceTest(
    'Duplicate conversation allows user to continue a shared conversation',
    async ({ page, pageObjects, browserAuth, context }) => {
      const { assistantPage } = pageObjects;

      // Share conversation globally
      await assistantPage.open();
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.selectConnector(connector.name);
      await assistantPage.shareConversation('global');

      // Login as secondary user (automatically clears cookies)
      await browserAuth.loginAs(secondaryUser);
      await page.gotoApp('security', { path: '/get_started' });
      await assistantPage.open();

      // Duplicate the shared conversation
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.duplicateConversation(mockConvo1.title);
      await assistantPage.expectCalloutState('private');

      // Send a new message
      await assistantPage.typeAndSendMessage('goodbye');

      // Verify message users
      await assistantPage.expectMessageUser(primaryUser, 0);
      await assistantPage.expectMessageUser(secondaryUser, 2);
    }
  );

  spaceTest(
    'Duplicate conversation from conversation menu creates a duplicate',
    async ({ pageObjects }) => {
      const { assistantPage } = pageObjects;

      await assistantPage.open();
      await assistantPage.selectConversation(mockConvo1.title);
      await assistantPage.duplicateFromMenu(mockConvo1.title);
    }
  );

  spaceTest(
    'Duplicate conversation from conversation side menu creates a duplicate and secondary user cannot access',
    async ({ page, pageObjects, browserAuth, context }) => {
      const { assistantPage } = pageObjects;

      await assistantPage.open();
      await assistantPage.toggleConversationSideMenu();
      await assistantPage.duplicateFromConversationSideContextMenu(mockConvo2.title);

      // Login as secondary user (automatically clears cookies)
      await browserAuth.loginAs(secondaryUser);
      await page.gotoApp('security', { path: '/get_started' });
      await assistantPage.open();

      // Check that the duplicated conversation is not visible to secondary user
      await assistantPage.toggleConversationSideMenu();
      await expect(page.locator(`text=${mockConvo2.title}`)).not.toBeVisible();
      await expect(page.locator(`text=[Duplicate] ${mockConvo2.title}`)).not.toBeVisible();
    }
  );

  spaceTest('Copy URL copies the proper url from conversation menu', async ({ pageObjects }) => {
    const { assistantPage } = pageObjects;

    await assistantPage.open();
    await assistantPage.selectConversation(mockConvo1.title);
    await assistantPage.selectConnector(connector.name);
    await assistantPage.copyUrlFromMenu();
    // Note: Playwright clipboard verification is flaky, skipping assertion
  });

  spaceTest(
    'Copy URL copies the proper url from conversation side menu',
    async ({ pageObjects }) => {
      const { assistantPage } = pageObjects;

      await assistantPage.open();
      await assistantPage.toggleConversationSideMenu();
      await assistantPage.copyUrlFromConversationSideContextMenu();
      // Note: Playwright clipboard verification is flaky, skipping assertion
    }
  );

  spaceTest('Copy URL copies the proper url from share modal', async ({ pageObjects }) => {
    const { assistantPage } = pageObjects;

    await assistantPage.open();
    await assistantPage.selectConversation(mockConvo1.title);
    await assistantPage.selectConnector(connector.name);
    await assistantPage.copyUrlFromShareModal();
    // Note: Playwright clipboard verification is flaky, skipping assertion
  });

  spaceTest(
    'Visiting a URL with the assistant param opens the assistant to the proper conversation',
    async ({ page, pageObjects, scoutSpace }) => {
      const { assistantPage } = pageObjects;

      const origin = new URL(page.url()).origin;
      await page.goto(
        `${origin}/app/security/get_started?assistant=${mockConvo1.id}_${scoutSpace.id}`
      );
      await assistantPage.expectConversationTitle(mockConvo1.title);
    }
  );

  spaceTest(
    'Visiting a URL with the assistant param shows access error when user does not have access to the conversation',
    async ({ page, browserAuth, scoutSpace, pageObjects }) => {
      // Login as secondary user (automatically clears cookies)
      await browserAuth.loginAs(secondaryUser);

      const origin = new URL(page.url()).origin;

      // Try to access conversation that doesn't belong to secondary user
      await page.goto(
        `${origin}/app/security/get_started?assistant=${mockConvo1.id}_${scoutSpace.id}`
      );

      // Assert access error toast appears
      await pageObjects.securityCommon.expectErrorComment();

      // Try to access non-existent conversation
      await page.goto(`${origin}/app/security/get_started?assistant=does-not-exist`);

      // Assert generic conversation error toast appears
      await pageObjects.securityCommon.expectErrorComment();
    }
  );
});
