/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  CLEAR_SYSTEM_PROMPT,
  CHAT_CONTEXT_MENU,
  CLEAR_CHAT,
  CONFIRM_CLEAR_CHAT,
  SYSTEM_PROMPT_SELECT,
  SYSTEM_PROMPT,
  CREATE_SYSTEM_PROMPT,
  SYSTEM_PROMPT_TITLE_INPUT,
  SYSTEM_PROMPT_BODY_INPUT,
  CONVERSATION_MULTI_SELECTOR,
  MODAL_SAVE_BUTTON,
  ADD_QUICK_PROMPT,
  QUICK_PROMPT_TITLE_INPUT,
  QUICK_PROMPT_BODY_INPUT,
  PROMPT_CONTEXT_SELECTOR,
  QUICK_PROMPT_BADGE,
  ADD_NEW_CONNECTOR,
  SEND_TO_TIMELINE_BUTTON,
} from '../screens/ai_assistant';
import { TOASTER } from '../screens/alerts_detection_rules';

export const openAssistant = (context?: 'rule' | 'alert') => {
  if (!context) {
    cy.get(AI_ASSISTANT_BUTTON).click();
    return;
  }
  if (context === 'rule') {
    cy.get(CHAT_ICON).should('be.visible');
    cy.get(CHAT_ICON).click();
    return;
  }
  if (context === 'alert') {
    cy.get(CHAT_ICON_SM).should('be.visible');
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
export const resetConversation = () => {
  cy.get(CHAT_CONTEXT_MENU).click();
  cy.get(CLEAR_CHAT).click();
  cy.get(CONFIRM_CLEAR_CHAT).click();
  cy.get(EMPTY_CONVO).should('be.visible');
};
export const selectConversation = (conversationName: string) => {
  cy.get(FLYOUT_NAV_TOGGLE).click();
  cy.get(CONVERSATION_SELECT(conversationName)).click();
  assertConversationTitle(conversationName);
  cy.get(FLYOUT_NAV_TOGGLE).click();
};

export const updateConversationTitle = (newTitle: string) => {
  cy.get(CONVERSATION_TITLE + ' h2').click();
  cy.get(CONVERSATION_TITLE + ' input').clear();
  cy.get(CONVERSATION_TITLE + ' input').type(newTitle);
  cy.get(CONVERSATION_TITLE + ' input').type('{enter}');
  assertConversationTitle(newTitle);
};

export const typeAndSendMessage = (message: string) => {
  cy.get(USER_PROMPT).type(message);
  cy.get(SUBMIT_CHAT).click();
};

export const sendQueryToTimeline = () => {
  cy.get(SEND_TO_TIMELINE_BUTTON).click();
};

export const clearSystemPrompt = () => {
  cy.get(CLEAR_SYSTEM_PROMPT).click();
  assertEmptySystemPrompt();
};

export const sendQuickPrompt = (prompt: string) => {
  cy.get(QUICK_PROMPT_BADGE(prompt)).click();
  cy.get(SUBMIT_CHAT).click();
};

export const selectSystemPrompt = (systemPrompt: string) => {
  cy.get(SYSTEM_PROMPT).click();
  cy.get(SYSTEM_PROMPT_SELECT(systemPrompt)).click();
  assertSystemPromptSelected(systemPrompt);
};

export const createSystemPrompt = (
  title: string,
  prompt: string,
  defaultConversations?: string[]
) => {
  cy.get(SYSTEM_PROMPT).click();
  cy.get(CREATE_SYSTEM_PROMPT).click();
  cy.get(SYSTEM_PROMPT_TITLE_INPUT).type(`${title}{enter}`);
  cy.get(SYSTEM_PROMPT_BODY_INPUT).type(prompt);
  if (defaultConversations && defaultConversations.length) {
    defaultConversations.forEach((conversation) => {
      cy.get(CONVERSATION_MULTI_SELECTOR).type(`${conversation}{enter}`);
    });
  }
  cy.get(MODAL_SAVE_BUTTON).click();
};

export const createQuickPrompt = (
  title: string,
  prompt: string,
  defaultConversations?: string[]
) => {
  cy.get(ADD_QUICK_PROMPT).click();
  cy.get(QUICK_PROMPT_TITLE_INPUT).type(`${title}{enter}`);
  cy.get(QUICK_PROMPT_BODY_INPUT).type(prompt);
  if (defaultConversations && defaultConversations.length) {
    defaultConversations.forEach((conversation) => {
      cy.get(PROMPT_CONTEXT_SELECTOR).type(`${conversation}{enter}`);
    });
  }
  cy.get(MODAL_SAVE_BUTTON).click();
};

export const selectRule = (ruleId: string) => {
  // not be.visible because of eui css
  cy.get(TIMELINE_CHECKBOX(ruleId)).should('exist');
  cy.get(TIMELINE_CHECKBOX(ruleId)).click();
};

/**
 * Assertions
 */
export const assertNewConversation = (isWelcome: boolean, title: string) => {
  if (isWelcome) {
    cy.get(WELCOME_SETUP).should('be.visible');
  } else {
    cy.get(EMPTY_CONVO).should('be.visible');
  }
  assertConversationTitle(title);
};

export const assertConversationTitle = (title: string) =>
  cy.get(CONVERSATION_TITLE + ' h2').should('have.text', title);

export const assertSystemPromptSent = (message: string) => {
  cy.get(CONVERSATION_MESSAGE).eq(0).should('contain', message);
};

export const assertMessageSent = (message: string, prompt: boolean = false) => {
  if (prompt) {
    return cy.get(CONVERSATION_MESSAGE).eq(1).should('contain', message);
  }
  cy.get(CONVERSATION_MESSAGE).eq(0).should('contain', message);
};

export const assertErrorResponse = () => {
  cy.get(CONVERSATION_MESSAGE_ERROR).should('be.visible');
};

export const assertSystemPromptSelected = (systemPrompt: string) => {
  cy.get(SYSTEM_PROMPT).should('have.text', systemPrompt);
};

export const assertEmptySystemPrompt = () => {
  const EMPTY = 'Select a system prompt';
  cy.get(SYSTEM_PROMPT).should('have.text', EMPTY);
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

const assertConversationTitleReadOnly = () => {
  cy.get(CONVERSATION_TITLE + ' h2').click();
  cy.get(CONVERSATION_TITLE + ' input').should('not.exist');
};

export const assertConversationReadOnly = () => {
  assertConversationTitleReadOnly();
  cy.get(ADD_NEW_CONNECTOR).should('be.disabled');
  cy.get(CHAT_CONTEXT_MENU).should('be.disabled');
  cy.get(FLYOUT_NAV_TOGGLE).should('be.disabled');
  cy.get(NEW_CHAT).should('be.disabled');
};
