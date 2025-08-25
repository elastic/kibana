/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { enableFeatureFlag } from '../../tasks/feature_flags';
import { getUserCredentials } from '../../tasks/users';
import { visitAssistantSettings } from '../../tasks/assistant';
import {
  ASSISTANT_SETTINGS_CONVERSATION_TABLE,
  ASSISTANT_SETTINGS_CONVERSATION_ICON,
  ASSISTANT_SETTINGS_CONVERSATION_EDIT_BUTTON,
  ASSISTANT_SETTINGS_CONVERSATION_SHARE_SELECT,
  ASSISTANT_SETTINGS_CONVERSATION_SAVE_BUTTON,
  ASSISTANT_SETTINGS_CONVERSATION_CANCEL_BUTTON,
  ASSISTANT_TOAST
} from '../../screens/assistant_settings';

describe('Security Assistant - Conversation Settings', { tags: ['@ess', '@serverless'] }, () => {
  const userB = getUserCredentials('user_b');
  const conversationTitle = 'Settings Conversation';

  before(() => {
    enableFeatureFlag('elasticAssistant.assistantSharingEnabled');
  });

  beforeEach(() => {
    login(userB);
    visitAssistantSettings();
  });

  it('should show only owned conversations in settings table', () => {
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .find('[data-test-subj="assistant-settings-conversation-title"]')
      .each($el => {
        cy.wrap($el).should('not.contain', '[Shared]');
      });
  });

  it('should show correct shared state icon in table', () => {
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .find('[data-test-subj="assistant-settings-conversation-row"]')
      .each($row => {
        cy.wrap($row)
          .find(ASSISTANT_SETTINGS_CONVERSATION_ICON)
          .should('exist');
      });
  });

  it('should allow editing and updating conversation share state', () => {
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .contains(conversationTitle)
      .parents('[data-test-subj="assistant-settings-conversation-row"]')
      .find(ASSISTANT_SETTINGS_CONVERSATION_EDIT_BUTTON)
      .click();
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_SHARE_SELECT).select('Global');
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_SAVE_BUTTON).click();
    cy.get(ASSISTANT_TOAST).should('contain', 'Conversation updated');
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .contains(conversationTitle)
      .parents('[data-test-subj="assistant-settings-conversation-row"]')
      .find(ASSISTANT_SETTINGS_CONVERSATION_ICON)
      .should('have.class', 'euiIcon--globe');
  });

  it('should not update share state if save is not pressed', () => {
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .contains(conversationTitle)
      .parents('[data-test-subj="assistant-settings-conversation-row"]')
      .find(ASSISTANT_SETTINGS_CONVERSATION_EDIT_BUTTON)
      .click();
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_SHARE_SELECT).select('Private');
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_CANCEL_BUTTON).click();
    cy.get(ASSISTANT_SETTINGS_CONVERSATION_TABLE)
      .contains(conversationTitle)
      .parents('[data-test-subj="assistant-settings-conversation-row"]')
      .find(ASSISTANT_SETTINGS_CONVERSATION_ICON)
      .should('not.have.class', 'euiIcon--lock');
  });
});
