/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOSE_FLYOUT } from '../screens/alerts';
import {
  AI_ASSISTANT_BUTTON,
  CHAT_ICON,
  CHAT_ICON_SM,
  CONNECTOR_SELECTOR,
  CONVERSATION_TITLE,
  EMPTY_CONVO,
  WELCOME_SETUP,
} from '../screens/ai_assistant';

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
  cy.get(CLOSE_FLYOUT).click();
};

export const assertConversation = (isWelcome: boolean, title: string) => {
  if (isWelcome) {
    cy.get(WELCOME_SETUP).should('exist');
  } else {
    cy.get(EMPTY_CONVO).should('exist');
  }
  cy.get(CONVERSATION_TITLE).should('have.text', title);
};

export const assertConnectorSelected = (connectorName: string) => {
  cy.get(CONNECTOR_SELECTOR).should('have.text', connectorName);
};
