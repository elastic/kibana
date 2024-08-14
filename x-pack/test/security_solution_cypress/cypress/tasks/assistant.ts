/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SYSTEM_PROMPT_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/system/translations';
import { TIMELINE_CHECKBOX } from '../screens/timelines';
import { CLOSE_FLYOUT } from '../screens/alerts';
import {
  AI_ASSISTANT_BUTTON,
  ASSISTANT_CHAT_BODY,
  CHAT_ICON,
  CHAT_ICON_SM,
  CONNECTOR_SELECT,
  CONNECTOR_SELECTOR,
  CONVERSATION_TITLE,
  EMPTY_CONVO,
  WELCOME_SETUP,
  NEW_CHAT,
  CONVERSATION_SELECT,
  FLYOUT_NAV_TOGGLE,
  CONVERSATION_MESSAGE,
  USER_PROMPT,
  SUBMIT_CHAT,
  CONVERSATION_MESSAGE_ERROR,
  CONVERSATION_TITLE_SAVE_BUTTON,
  CLEAR_SYSTEM_PROMPT,
  CHAT_CONTEXT_MENU,
  CLEAR_CHAT,
  CONFIRM_CLEAR_CHAT,
} from '../screens/ai_assistant';
import { TOASTER } from '../screens/alerts_detection_rules';

export const openAssistant = (context?: 'rule' | 'alert') => {
  if (!context) {
    cy.get(AI_ASSISTANT_BUTTON).click();
    return;
  }
  if (context === 'rule') {
    cy.get(CHAT_ICON).should('exist');
    cy.get(CHAT_ICON).click();
    return;
  }
  if (context === 'alert') {
    cy.get(CHAT_ICON_SM).should('exist');
    cy.get(CHAT_ICON_SM).click();
    return;
  }
};

export const closeAssistant = () => {
  cy.get(`${ASSISTANT_CHAT_BODY} ${CLOSE_FLYOUT}`).click();
};

export const createNewChat = () => {
  cy.get(`${NEW_CHAT}`).click();
};

export const selectConnector = (connectorName: string) => {
  cy.get(CONNECTOR_SELECTOR).click();
  cy.get(CONNECTOR_SELECT(connectorName)).click();
  assertConnectorSelected(connectorName);
};

export const assertNewConversation = (isWelcome: boolean, title: string) => {
  if (isWelcome) {
    cy.get(WELCOME_SETUP).should('exist');
  } else {
    cy.get(EMPTY_CONVO).should('exist');
  }
  cy.get(CONVERSATION_TITLE + ' h2').should('have.text', title);
};

export const assertMessageSent = (message: string, hasDefaultPrompt = false) => {
  cy.get(CONVERSATION_MESSAGE)
    .first()
    .should(
      'have.text',
      hasDefaultPrompt ? `${DEFAULT_SYSTEM_PROMPT_NON_I18N}\n${message}` : message
    );
};
export const clearSystemPrompt = () => {
  cy.get(CLEAR_SYSTEM_PROMPT).click();
};
export const resetConversation = () => {
  cy.get(CHAT_CONTEXT_MENU).click();
  cy.get(CLEAR_CHAT).click();
  cy.get(CONFIRM_CLEAR_CHAT).click();
  cy.get(EMPTY_CONVO).should('exist');
};
export const typeAndSendMessage = (message: string) => {
  cy.get(USER_PROMPT).type(message);
  cy.get(SUBMIT_CHAT).click();
};

export const selectRule = (ruleId: string) => {
  cy.get(TIMELINE_CHECKBOX(ruleId)).should('exist');
  cy.get(TIMELINE_CHECKBOX(ruleId)).click();
};

export const assertErrorResponse = () => {
  cy.get(CONVERSATION_MESSAGE_ERROR).should('exist');
};

export const selectConversation = (conversationName: string) => {
  cy.get(FLYOUT_NAV_TOGGLE).click();
  cy.get(CONVERSATION_SELECT(conversationName)).click();
  cy.get(CONVERSATION_TITLE + ' h2').should('have.text', conversationName);
  cy.get(FLYOUT_NAV_TOGGLE).click();
};

export const assertConnectorSelected = (connectorName: string) => {
  cy.get(CONNECTOR_SELECTOR).should('have.text', connectorName);
};

export const assertErrorToastShown = (message?: string) => {
  cy.get(TOASTER).should('be.visible');
  if (message?.length) {
    cy.get(TOASTER).should('contain', message);
  }
};

export const updateConversationTitle = (newTitle: string) => {
  cy.get(CONVERSATION_TITLE + ' h2').click();
  cy.get(CONVERSATION_TITLE + ' input').clear();
  cy.get(CONVERSATION_TITLE + ' input').type(newTitle);
  cy.get(CONVERSATION_TITLE_SAVE_BUTTON).click();
  cy.get(CONVERSATION_TITLE + ' h2').should('have.text', newTitle);
};
