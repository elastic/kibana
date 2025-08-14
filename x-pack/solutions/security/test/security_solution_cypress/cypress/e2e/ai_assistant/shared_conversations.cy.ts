/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
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
  createAndTitleConversation,
  dismissSharedCallout,
  duplicateConversation,
  openAssistant,
  openShareMenu,
  selectConnector,
  selectConversation,
  selectNotShared,
  selectShareModal,
  selectShareType,
  shareConversation,
  shareConversations,
  shareConversationWithUser,
  submitShareModal,
  toggleConversationSideMenu,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { deleteConversations, waitForConversation } from '../../tasks/api_calls/assistant';
import { azureConnectorAPIPayload, createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login, logout } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';

describe('AI Assistant Conversations', { tags: ['@ess', '@serverless'] }, () => {
  const isServerless = Cypress.env(IS_SERVERLESS);
  const primaryUser = isServerless ? 'elastic_admin' : 'system_indices_superuser';
  const secondaryUser = isServerless ? ROLES.soc_manager : 'elastic';
  const mockConvo1 = {
    id: 'spooky',
    title: 'Spooky convo',
    messages: [
      {
        timestamp: '2025-08-14T21:08:24.923Z',
        content: 'Hi spooky robot',
        user: {
          name: primaryUser,
        },
        role: 'user',
      },
      {
        timestamp: '2025-08-14T21:08:25.349Z',
        content: 'Hello spooky person',
        role: 'assistant',
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
        user: {
          name: primaryUser,
        },
        role: 'user',
      },
      {
        timestamp: '2025-08-14T21:08:25.349Z',
        content: 'Hello silly person',
        role: 'assistant',
      },
    ],
  };
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    login(isServerless ? 'admin' : undefined);
    createAzureConnector();
    waitForConversation(mockConvo1);
    waitForConversation(mockConvo2);
  });
  it.skip('Share modal works to not share, share globally, and share selected', () => {
    visitGetStartedPage();
    openAssistant();
    selectConversation(mockConvo1.title);
    selectConnector(azureConnectorAPIPayload.name);
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
    // Select secondaryUser to share the conversation
    shareConversationWithUser(secondaryUser);
    submitShareModal();
    assertOwnerSharedCallout();
    openShareMenu();
    assertSharedMenu(false);
    // Opens to selected share since conversation is shared with selected users
    selectShareModal();
    assertShareModalType('selected');
    assertShareUser(secondaryUser);
    closeShareModal();

    toggleConversationSideMenu();
    assertSharedConversationIcon(mockConvo2.title);
  });
  it.only('Shared conversations appear for the user they were shared with', () => {
    // cy.log('hello 1');
    // logout();
    // cy.log('hello 2');
    // login(secondaryUser === 'test_user' ? ROLES.soc_manager : secondaryUser);
    // cy.log('hello 3');
    // logout();
    // cy.log('hello 4');
    // login('admin');
    // cy.log('hello 5');
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
      {
        title: mockConvo2.title,
        share: 'test_user',
      },
    ]);
    // First logout admin user
    logout();

    // Login as elastic user who should have access to shared conversations
    login(secondaryUser);
    visitGetStartedPage();
    openAssistant();

    // Check if the shared conversations are visible
    toggleConversationSideMenu();
    cy.contains(mockConvo1.title).should('exist');
    cy.contains(mockConvo2.title).should('not.exist');
    assertSharedConversationIcon(mockConvo1.title);
    toggleConversationSideMenu();

    // Verify the first conversation is shared with secondaryUser
    selectConversation(mockConvo1.title);
    assertSharedCallout();
    // Ensure we can view messages in the shared conversation
    assertMessageSent(mockConvo1.messages[0].content);
    const newConvoTitle = 'Other conversation';
    createAndTitleConversation(newConvoTitle);
    shareConversation(primaryUser);
    // First logout admin user
    logout();
    login(isServerless ? 'admin' : undefined);
    openAssistant();
    // Check if the selectedly shared conversation is visible
    toggleConversationSideMenu();
    cy.contains(newConvoTitle).should('exist');
    assertSharedConversationIcon(newConvoTitle);
    toggleConversationSideMenu();
    // Verify the first conversation is shared with secondaryUser
    selectConversation(newConvoTitle);
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
        share: secondaryUser,
      },
    ]);
    logout();

    login(secondaryUser === 'test_user' ? 'system_indices_superuser' : secondaryUser);
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
  it('Duplicate conversation works as expected', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
    ]);

    logout();

    login(secondaryUser === 'test_user' ? 'system_indices_superuser' : secondaryUser);
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    duplicateConversation(mockConvo1.title);
    assertNotSharedCallout();
    typeAndSendMessage('goodbye');
    assertMessageUser(primaryUser, 0);
    assertMessageUser(`${isServerless ? 'test ' : ''}${secondaryUser}`, 2);
  });
});
