/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IS_SERVERLESS } from '../../env_var_names_constants';
import {
  assertMessageSent,
  assertMessageUser,
  assertNoSharedCallout,
  assertNotSharedCallout,
  assertNotSharedConversationIcon,
  assertNotSharedMenu,
  assertOwnerSharedCallout,
  assertSharedCallout,
  assertSharedConversationIcon,
  assertSharedMenu,
  assertShareModalType,
  assertShareUser,
  closeShareModal,
  dismissSharedCallout,
  duplicateConversation,
  openAssistant,
  openShareMenu,
  selectConnector,
  selectConversation,
  selectNotShared,
  selectShareModal,
  selectShareType,
  shareConversations,
  shareConversationWithUser,
  submitShareModal,
  toggleConversationSideMenu,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { deleteConversations, waitForConversation } from '../../tasks/api_calls/assistant';
import { azureConnectorAPIPayload, createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';

const mockConvo1 = {
  id: 'spooky',
  title: 'Spooky convo',
  messages: [],
};
const mockConvo2 = {
  id: 'silly',
  title: 'Silly convo',
  messages: [],
};
describe('AI Assistant Conversations', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    login(Cypress.env(IS_SERVERLESS) ? 'admin' : undefined);
    createAzureConnector();
    waitForConversation(mockConvo1);
    waitForConversation(mockConvo2);
  });
  it('Share modal works to not share, share globally, and share selected', () => {
    visitGetStartedPage();
    openAssistant();
    selectConversation(mockConvo1.title);
    selectConnector(azureConnectorAPIPayload.name);
    typeAndSendMessage('hello');
    assertMessageSent('hello');
    // Assert that the conversation is not shared
    assertNotSharedCallout();
    // Open the share menu and verify not shared state
    openShareMenu();
    assertNotSharedMenu();
    // Selecting 'not shared' should not change sharing settings
    selectNotShared();
    assertNotSharedCallout();
    openShareMenu();
    assertNotSharedMenu();
    // Opening and closing the share modal should not change sharing settings
    selectShareModal();
    assertShareModalType('global');
    closeShareModal();
    assertNotSharedCallout();
    openShareMenu();
    assertNotSharedMenu();
    // Opening the share menu and selecting global share changes sharing settings
    selectShareModal();
    assertShareModalType('global');
    submitShareModal();
    assertOwnerSharedCallout();
    openShareMenu();
    assertSharedMenu();
    toggleConversationSideMenu();
    assertSharedConversationIcon(mockConvo1.title);
    assertNotSharedConversationIcon(mockConvo2.title);
    toggleConversationSideMenu();
    // Share the other conversation with selected users
    selectConversation(mockConvo2.title);
    selectConnector(azureConnectorAPIPayload.name);
    typeAndSendMessage('hello');
    assertMessageSent('hello');
    // Assert that the conversation is not shared
    assertNotSharedCallout();
    openShareMenu();
    assertNotSharedMenu();
    selectShareModal();
    assertShareModalType('global');
    selectShareType('selected');
    // Press save without selecting users
    submitShareModal();
    assertNotSharedCallout();
    openShareMenu();
    assertNotSharedMenu();
    selectShareModal();
    assertShareModalType('global');
    selectShareType('selected');
    // Select user 'elastic' to share the conversation
    shareConversationWithUser('elastic');
    submitShareModal();
    assertOwnerSharedCallout();
    openShareMenu();
    assertSharedMenu(false);
    // Opens to select share since conversation is shared with selected users
    selectShareModal();
    assertShareModalType('selected');
    assertShareUser('elastic');
    closeShareModal();

    toggleConversationSideMenu();
    assertSharedConversationIcon(mockConvo2.title);
  });
  it('Shared conversations appear for the user they were shared with', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
      {
        title: mockConvo2.title,
        share: 'elastic',
      },
    ]);
    // First logout admin user
    cy.clearCookies();

    // Login as elastic user who should have access to shared conversations
    login('elastic');
    visitGetStartedPage();
    openAssistant();

    // Check if the shared conversations are visible
    toggleConversationSideMenu();
    cy.contains(mockConvo2.title).should('exist');
    assertSharedConversationIcon(mockConvo2.title);
    cy.contains(mockConvo1.title).should('exist');
    assertSharedConversationIcon(mockConvo1.title);
    toggleConversationSideMenu();

    // Verify the first conversation is shared globally
    selectConversation(mockConvo1.title);
    assertSharedCallout();

    // Verify the second conversation is shared with selected users
    selectConversation(mockConvo2.title);
    assertSharedCallout();

    // Ensure we can view messages in the shared conversation
    assertMessageSent('hello');
  });
  it('Dismissed callout remains dismissed when conversation is unselected and selected again', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
      {
        title: mockConvo2.title,
        share: 'elastic',
      },
    ]);
    cy.clearCookies();

    login('elastic');
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    assertSharedCallout();
    dismissSharedCallout();

    selectConversation(mockConvo2.title);
    assertSharedCallout();

    selectConversation(mockConvo1.title);
    assertNoSharedCallout();
  });
  it.only('Duplicate conversation works as expected', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
    ]);
    cy.clearCookies();

    login('elastic');
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    duplicateConversation(mockConvo1.title);
    assertNotSharedCallout();
    typeAndSendMessage('goodbye');
    assertMessageUser('system_indices_superuser', 0);
    assertMessageUser('elastic', 2);
  });
});
