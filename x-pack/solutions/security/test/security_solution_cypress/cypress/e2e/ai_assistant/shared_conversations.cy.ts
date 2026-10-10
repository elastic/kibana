/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, MessageRole } from '@kbn/elastic-assistant-common';
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
import { getFullname, getUsername } from '../../tasks/common';
import { login } from '../../tasks/login';
import { setPreferredChatExperienceToClassic } from '../../tasks/api_calls/kibana_advanced_settings';
import { visit, visitGetStartedPage } from '../../tasks/navigation';
const userRole: MessageRole = 'user';
const assistantRole: MessageRole = 'assistant';
describe('Assistant Conversation Sharing', { tags: ['@ess', '@serverless'] }, () => {
  const isServerless = Cypress.env(IS_SERVERLESS);
  // The secondary identity comes from the same authentication mechanism as the primary one: a
  // mock IdP SAML session in serverless, basic auth in ESS. Both roles hold every Kibana
  // application privilege, which the share modal requires of the users it suggests.
  const secondaryRole = isServerless ? 'system_indices_superuser' : 'elastic';
  let primaryUser: string;
  let secondaryUser: string;
  let secondaryUserFullName: string;
  const mockConvo1: { id: string; title: string; messages: Message[] } = {
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
  const mockConvo2: { id: string; title: string; messages: Message[] } = {
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
  const seedConversation = (conversation: typeof mockConvo1) =>
    waitForConversation({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.role === userRole ? { ...message, user: { name: primaryUser } } : message
      ),
    });
  before(() => {
    getUsername('admin').then((username) => {
      primaryUser = username as string;
    });
    // Signing the secondary user in once activates their Kibana user profile, without which
    // they cannot be suggested by, nor shared a conversation with, the share modal.
    login(secondaryRole);
    getSecondaryUsername(isServerless, secondaryRole).then((username) => {
      secondaryUser = username as string;
    });
    getSecondaryFullName(isServerless, secondaryRole).then((fullName) => {
      secondaryUserFullName = fullName as string;
    });
    cy.clearCookies();
  });
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    login(isServerless ? 'admin' : undefined);
    setPreferredChatExperienceToClassic();
    createAzureConnector();
    seedConversation(mockConvo1);
    seedConversation(mockConvo2);
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

    // Login as the secondary user who should have access to shared conversations
    login(secondaryRole);
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

    login(secondaryRole);
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

    login(secondaryRole);
    visitGetStartedPage();
    openAssistant();

    selectConversation(mockConvo1.title);
    duplicateConversation(mockConvo1.title);
    assertCalloutState('private');
    typeAndSendMessage('goodbye');
    assertMessageUser(primaryUser, 0);
    assertMessageUser(secondaryUserFullName, 2);
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

    // Login as the secondary user who should have access to shared conversations
    login(secondaryRole);
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

    // Login as the secondary user, who has not been given access to the conversation
    login(secondaryRole);

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

// In ESS the secondary user logs in with basic auth, where the user name is the role name
// itself. In serverless the mock IdP derives both the user name and the full name from the role,
// and the user name is a hash rather than the role name.
const getSecondaryUsername = (isServerless: boolean, role: string) =>
  isServerless ? getUsername(role) : cy.wrap(role);

const getSecondaryFullName = (isServerless: boolean, role: string) =>
  isServerless ? getFullname(role) : cy.wrap(role);
