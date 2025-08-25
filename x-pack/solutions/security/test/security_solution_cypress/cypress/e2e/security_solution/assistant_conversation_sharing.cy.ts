/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { enableFeatureFlag } from '../../tasks/feature_flags';
import { createUsers, getUserCredentials } from '../../tasks/users';
import { visitAssistant } from '../../tasks/assistant';
import {
  ASSISTANT_HEADER,
  ASSISTANT_CONVERSATION_LIST,
  ASSISTANT_SHARE_BADGE,
  ASSISTANT_SHARE_MODAL,
  ASSISTANT_SHARE_MODAL_USER_SEARCH,
  ASSISTANT_SHARE_MODAL_USER_LIST,
  ASSISTANT_SHARE_MODAL_CONFIRM,
  ASSISTANT_TOAST,
  ASSISTANT_CONVERSATION_ITEM,
  ASSISTANT_CONVERSATION_ITEM_CONTEXT_MENU,
  ASSISTANT_CONVERSATION_ITEM_COPY_URL,
  ASSISTANT_CONVERSATION_ITEM_DUPLICATE,
  ASSISTANT_CONVERSATION_ITEM_DELETE,
  ASSISTANT_CONVERSATION_ITEM_ICON,
  ASSISTANT_CONVERSATION_OWNER_CALLOUT,
  ASSISTANT_CONVERSATION_SHARED_CALLOUT,
  ASSISTANT_CONVERSATION_CONTINUE_BUTTON,
  ASSISTANT_CONVERSATION_MESSAGE_USER_AVATAR,
  ASSISTANT_CONVERSATION_DUPLICATE_BUTTON
} from '../../screens/assistant';

// Helper to select a conversation by title
const selectConversationByTitle = (title: string) => {
  cy.get(ASSISTANT_CONVERSATION_LIST)
    .contains('[data-test-subj="assistant-conversation-list-item-title"]', title)
    .click();
};

describe('Security Assistant - Conversation Sharing', { tags: ['@ess', '@serverless'] }, () => {
  const userA = getUserCredentials('user_a');
  const userB = getUserCredentials('user_b');
  const badUser = getUserCredentials('bad_user');
  const conversationTitles = {
    private: 'Private Conversation',
    shared: 'Shared Conversation',
    global: 'Global Conversation',
    sharedNew: 'Shared New Conversation',
    globalNew: 'Global New Conversation',
    duplicate: '[Duplicate] Shared Conversation',
  };

  before(() => {
    enableFeatureFlag('elasticAssistant.assistantSharingEnabled');
    createUsers([userA, userB, badUser]);
  });

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('should allow owner to share conversations with specific users and globally', () => {
    login(userA);
    visitAssistant();

    // Create a private conversation
    cy.get('[data-test-subj="assistant-new-conversation-button"]').click();
    cy.get('[data-test-subj="assistant-conversation-title-input"]').type(conversationTitles.private);
    cy.get('[data-test-subj="assistant-conversation-save-button"]').click();

    // Share with User B
    cy.get(ASSISTANT_SHARE_BADGE).click();
    cy.get('[data-test-subj="assistant-share-option-shared"]').click();
    cy.get(ASSISTANT_SHARE_MODAL).should('be.visible');
    cy.get(ASSISTANT_SHARE_MODAL_USER_SEARCH).type(userB.username);
    cy.get(ASSISTANT_SHARE_MODAL_USER_LIST)
      .contains(userB.username)
      .click();
    cy.get(ASSISTANT_SHARE_MODAL_CONFIRM).click();
    cy.get(ASSISTANT_TOAST).should('contain', 'Conversation shared');

    // Share globally
    cy.get(ASSISTANT_SHARE_BADGE).click();
    cy.get('[data-test-subj="assistant-share-option-global"]').click();
    cy.get(ASSISTANT_TOAST).should('contain', 'Conversation updated to global');
  });

  it('should display correct share icons in conversation list', () => {
    login(userA);
    visitAssistant();

    cy.get(ASSISTANT_CONVERSATION_LIST).within(() => {
      cy.contains(conversationTitles.private)
        .parent()
        .find(ASSISTANT_CONVERSATION_ITEM_ICON)
        .should('have.class', 'euiIcon--lock');
      cy.contains(conversationTitles.shared)
        .parent()
        .find(ASSISTANT_CONVERSATION_ITEM_ICON)
        .should('have.class', 'euiIcon--users');
      cy.contains(conversationTitles.global)
        .parent()
        .find(ASSISTANT_CONVERSATION_ITEM_ICON)
        .should('have.class', 'euiIcon--globe');
    });
  });

  it('should show Owner Shared Callout and persist dismissal', () => {
    login(userA);
    visitAssistant();
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_OWNER_CALLOUT).should('be.visible');
    cy.get('[data-test-subj="assistant-conversation-owner-callout-dismiss"]').click();
    cy.get(ASSISTANT_CONVERSATION_OWNER_CALLOUT).should('not.exist');
    // Switch conversation and return
    selectConversationByTitle(conversationTitles.global);
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_OWNER_CALLOUT).should('not.exist');
  });

  it('should restrict access for shared-with-me conversations', () => {
    login(userB);
    visitAssistant();
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_SHARED_CALLOUT).should('be.visible');
    cy.get(ASSISTANT_CONVERSATION_CONTINUE_BUTTON).should('be.disabled');
    cy.get(ASSISTANT_CONVERSATION_ITEM_CONTEXT_MENU).click();
    cy.get(ASSISTANT_CONVERSATION_ITEM_DELETE).should('not.exist');
    cy.get(ASSISTANT_CONVERSATION_ITEM_DUPLICATE).should('exist');
    cy.get(ASSISTANT_CONVERSATION_ITEM_COPY_URL).should('exist');
    cy.get(ASSISTANT_CONVERSATION_MESSAGE_USER_AVATAR).should('contain', userA.username);
  });

  it('should allow duplicating a shared conversation and attribute messages correctly', () => {
    login(userB);
    visitAssistant();
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_DUPLICATE_BUTTON).click();
    cy.get('[data-test-subj="assistant-conversation-title"]').should('contain', conversationTitles.duplicate);
    cy.get(ASSISTANT_CONVERSATION_CONTINUE_BUTTON).should('not.be.disabled');
    cy.get(ASSISTANT_CONVERSATION_MESSAGE_USER_AVATAR).first().should('contain', userA.username);
    cy.get(ASSISTANT_CONVERSATION_MESSAGE_USER_AVATAR).last().should('contain', userB.username);
  });

  it('should persist Shared Conversation Callout dismissal', () => {
    login(userB);
    visitAssistant();
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_SHARED_CALLOUT).should('be.visible');
    cy.get('[data-test-subj="assistant-conversation-shared-callout-dismiss"]').click();
    cy.get(ASSISTANT_CONVERSATION_SHARED_CALLOUT).should('not.exist');
    selectConversationByTitle(conversationTitles.global);
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_SHARED_CALLOUT).should('not.exist');
  });

  it('should copy URL and open shared conversation via URL', () => {
    login(userA);
    visitAssistant();
    selectConversationByTitle(conversationTitles.shared);
    cy.get(ASSISTANT_CONVERSATION_ITEM_CONTEXT_MENU).click();
    cy.get(ASSISTANT_CONVERSATION_ITEM_COPY_URL).click();
    cy.window().then(win => {
      cy.stub(win.navigator.clipboard, 'readText').returns(Promise.resolve(win.location.href));
      cy.window().invoke('open', win.location.href, '_blank');
    });
    // Should open assistant with the conversation selected
    cy.get('[data-test-subj="assistant-conversation-title"]').should('contain', conversationTitles.shared);
  });

  it('should not show restricted users in share modal search', () => {
    login(userA);
    visitAssistant();
    cy.get(ASSISTANT_SHARE_BADGE).click();
    cy.get('[data-test-subj="assistant-share-option-shared"]').click();
    cy.get(ASSISTANT_SHARE_MODAL_USER_SEARCH).type(badUser.username);
    cy.get(ASSISTANT_SHARE_MODAL_USER_LIST).should('not.contain', badUser.username);
  });
});
