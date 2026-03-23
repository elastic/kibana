/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MessageRole } from '@kbn/elastic-assistant-common';
import { closeToast } from '../../tasks/common/toast';
import { IS_SERVERLESS } from '../../env_var_names_constants';
import {
  assertCalloutState,
  assertConversationTitle,
  assertMessageSent,
  assertMessageUser,
  assertNoSharedCallout,
  assertNotSharedConversationIcon,
  assertSharedConversationIcon,
  assertShareMenuStatus,
  assertShareUser,
  closeShareModal,
  copyUrlFromConversationSideContextMenu,
  copyUrlFromMenu,
  copyUrlFromShareModal,
  dismissSharedCallout,
  duplicateConversation,
  duplicateFromConversationSideContextMenu,
  duplicateFromMenu,
  openAssistant,
  openShareMenu,
  selectConnector,
  selectConversation,
  selectPrivate,
  selectShareModal,
  shareConversations,
  shareConversationWithUser,
  submitShareModal,
  toggleConversationSideMenu,
  typeAndSendMessage,
  selectGlobal,
  assertAccessErrorToast,
  assertGenericConversationErrorToast,
} from '../../tasks/assistant';
import { deleteConversations, waitForConversation } from '../../tasks/api_calls/assistant';
import { azureConnectorAPIPayload, createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login, loginWithUser } from '../../tasks/login';
import { visit, visitGetStartedPage } from '../../tasks/navigation';
const userRole: MessageRole = 'user';
const assistantRole: MessageRole = 'assistant';
// TODO: Skipped due to https://github.com/elastic/kibana/issues/235416
describe.skip('Assistant Conversation Sharing', { tags: ['@ess', '@serverless'] }, () => {
  const isServerless = Cypress.env(IS_SERVERLESS);
  const primaryUser = isServerless ? 'elastic_admin' : 'system_indices_superuser';
  const secondaryUser = isServerless ? 'elastic_serverless' : 'elastic';
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
        user: {
          name: primaryUser,
        },
        role: userRole,
      },
      {
        timestamp: '2025-08-14T21:08:25.349Z',
        content: 'Hello silly person',
        role: assistantRole,
      },
    ],
  };
  before(() => {
    loginSecondaryUser(isServerless, secondaryUser);
    cy.clearCookies();
  });
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    login(isServerless ? 'admin' : undefined);
    createAzureConnector();
    waitForConversation(mockConvo1);
    waitForConversation(mockConvo2);
    visitGetStartedPage();
  });
  it('Share modal works to not share, share globally, and share selected', () => {
    openAssistant();
    selectConversation(mockConvo1.title);
    selectConnector(azureConnectorAPIPayload.name);
    // Assert that the conversation is not shared
    assertCalloutState('private');
    // Open the share menu and verify not shared state
    openShareMenu();
    assertShareMenuStatus('Private');
    // Selecting 'not shared' should not change sharing settings.
    selectPrivate();
    assertCalloutState('private');
    openShareMenu();
    assertShareMenuStatus('Private');
    // Opening and closing the share modal should not change sharing settings
    selectShareModal();
    closeShareModal();
    assertCalloutState('private');
    openShareMenu();
    assertShareMenuStatus('Private');
    // Slecting global share changes sharing settings
    selectGlobal();
    // submitShareModal(); success toast?
    assertCalloutState('shared-by-me');
    closeToast();
    openShareMenu();
    assertShareMenuStatus('Shared');
    toggleConversationSideMenu();
    assertSharedConversationIcon(mockConvo1.title);
    assertNotSharedConversationIcon(mockConvo2.title);
    toggleConversationSideMenu();
    // Share the other conversation with selected users
    selectConversation(mockConvo2.title);
    selectConnector(azureConnectorAPIPayload.name);
    // Assert that the conversation is not shared
    assertCalloutState('private');
    openShareMenu();
    assertShareMenuStatus('Private');
    selectShareModal();
    // Press save without selecting users
    submitShareModal();
    assertCalloutState('private');
    openShareMenu();
    assertShareMenuStatus('Private');
    selectShareModal();
    // Select secondaryUser to share the conversation
    shareConversationWithUser(secondaryUser);
    submitShareModal();
    assertCalloutState('shared-by-me');
    openShareMenu();
    assertShareMenuStatus('Restricted');
    // Opens to selected share since conversation is shared with selected users
    selectShareModal();
    assertShareUser(secondaryUser);
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
        share: secondaryUser,
      },
    ]);
    // First logout admin user
    cy.clearCookies();

    // Login as elastic user who should have access to shared conversations
    loginSecondaryUser(isServerless, secondaryUser);
    visitGetStartedPage();
    openAssistant();

    // Check if the shared conversations are visible
    toggleConversationSideMenu();
    cy.contains(mockConvo1.title).should('exist');

    cy.contains(mockConvo2.title).should('exist');
    assertSharedConversationIcon(mockConvo2.title);

    assertSharedConversationIcon(mockConvo1.title);
    toggleConversationSideMenu();

    // Verify the first conversation is shared with secondaryUser
    selectConversation(mockConvo1.title);
    assertCalloutState('shared-with-me');
    // Ensure we can view messages in the shared conversation
    assertMessageSent(mockConvo1.messages[0].content);
  });
  it('Dismissed callout remains dismissed when conversation is unselected and selected again', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
      {
        title: mockConvo2.title,
        share: 'global',
      },
    ]);
    cy.clearCookies();

    loginSecondaryUser(isServerless, secondaryUser);
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    assertCalloutState('shared-with-me');
    dismissSharedCallout();

    selectConversation(mockConvo2.title);
    assertCalloutState('shared-with-me');

    selectConversation(mockConvo1.title);
    assertNoSharedCallout();
  });
  it('Duplicate conversation allows user to continue a shared conversation', () => {
    shareConversations([
      {
        title: mockConvo1.title,
        share: 'global',
      },
    ]);

    cy.clearCookies();

    loginSecondaryUser(isServerless, secondaryUser);
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    duplicateConversation(mockConvo1.title);
    assertCalloutState('private');
    typeAndSendMessage('goodbye');
    assertMessageUser(primaryUser, 0);
    assertMessageUser(secondaryUser, 2);
  });

  it('Duplicate conversation from conversation menu creates a duplicate', () => {
    openAssistant();
    selectConversation(mockConvo1.title);
    duplicateFromMenu(mockConvo1.title);
  });

  it('Duplicate conversation from conversation side menu creates a duplicate and secondary user cannot access', () => {
    openAssistant();
    toggleConversationSideMenu();
    duplicateFromConversationSideContextMenu(mockConvo2.title);

    cy.clearCookies();

    // Login as elastic user who should have access to shared conversations
    loginSecondaryUser(isServerless, secondaryUser);
    visitGetStartedPage();
    openAssistant();

    // Check if the shared conversations are visible
    toggleConversationSideMenu();
    cy.contains(mockConvo2.title).should('not.exist');
    cy.contains(`[Duplicate] ${mockConvo2.title}`).should('not.exist');
  });

  it('Copy URL copies the proper url from conversation menu', () => {
    openAssistant();
    selectConversation(mockConvo1.title);
    selectConnector(azureConnectorAPIPayload.name);
    copyUrlFromMenu();
    // Cypress paste (doc.execCommand('paste')) is flaky, so skipping that assertion
  });
  it('Copy URL copies the proper url from conversation side menu', () => {
    openAssistant();
    toggleConversationSideMenu();
    copyUrlFromConversationSideContextMenu();
    // Cypress paste (doc.execCommand('paste')) is flaky, so skipping that assertion
  });

  it('Copy URL copies the proper url from share modal', () => {
    openAssistant();
    selectConversation(mockConvo1.title);
    selectConnector(azureConnectorAPIPayload.name);
    copyUrlFromShareModal();
    // Cypress paste (doc.execCommand('paste')) is flaky, so skipping that assertion
  });

  it('Visiting a URL with the assistant param opens the assistant to the proper conversation', () => {
    cy.location('origin').then((origin) => {
      visit(`${origin}/app/security/get_started?assistant=${mockConvo1.id}`);
    });
    assertConversationTitle(mockConvo1.title);
  });

  it('Visiting a URL with the assistant param shows access error when user does not have access to the conversation', () => {
    cy.clearCookies();

    // Login as elastic user who should have access to shared conversations
    loginSecondaryUser(isServerless, secondaryUser);

    cy.location('origin').then((origin) => {
      visit(`${origin}/app/security/get_started?assistant=${mockConvo1.id}`);
    });
    assertAccessErrorToast();

    cy.location('origin').then((origin) => {
      visit(`${origin}/app/security/get_started?assistant=does-not-exist`);
    });

    assertGenericConversationErrorToast();
  });
});

const loginSecondaryUser = (isServerless: boolean, username: string) => {
  if (isServerless) {
    loginWithUser({ username, password: 'changeme' });
  } else {
    login(username);
  }
};
