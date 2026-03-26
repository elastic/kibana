/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_RULE_CREATION_PROMPT_TEXTAREA,
  AI_RULE_CREATION_SEND_BUTTON,
  AI_RULE_CREATION_REGENERATE_BUTTON,
  AI_RULE_CREATION_CANCEL_BUTTON,
  AI_RULE_CREATION_CONNECTOR_SELECTOR,
  AI_RULE_CREATION_INFO_CALLOUT,
  AI_RULE_CREATION_PROGRESS,
  AI_RULE_CREATION_UPDATES,
  CREATE_RULE_MENU_BUTTON,
  CREATE_RULE_MENU_POPOVER,
  AI_RULE_CREATION_MENU_ITEM,
  AI_RULE_CREATION_BACK_TO_PROMPT_LINK,
  NEW_AGENT_BUILDER_ATTACHMENT_BUTTON,
  AGENT_BUILDER_CONVERSATION_FLYOUT_WRAPPER,
  AGENT_BUILDER_CONVERSATION_INPUT_EDITOR,
  AI_RULE_CREATION_CANCELLED_CALLOUT,
} from '../screens/ai_rule_creation';
import { ESQL_QUERY_BAR } from '../screens/create_new_rule';
import { visit } from './navigation';
import { AI_RULE_CREATION_URL } from '../urls/navigation';

export const visitAiRuleCreationPage = () => {
  visit(AI_RULE_CREATION_URL);
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).should('be.visible');
};

const openCreateRuleMenu = () => {
  cy.get(CREATE_RULE_MENU_BUTTON).should('be.visible').click();
  cy.get(CREATE_RULE_MENU_POPOVER).should('be.visible');
};

export const selectAiRuleCreation = () => {
  openCreateRuleMenu();
  cy.get(AI_RULE_CREATION_MENU_ITEM).should('be.visible').click();
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).should('be.visible');
};

const typePrompt = (prompt: string) => {
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).clear();
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).type(prompt);
};

export const submitRuleCreationPrompt = (prompt: string) => {
  typePrompt(prompt);
  cy.get(AI_RULE_CREATION_SEND_BUTTON).should('not.be.disabled').click();
};

export const clickCancelButton = () => {
  cy.get(AI_RULE_CREATION_CANCEL_BUTTON).should('be.visible').click();
};

export const assertInfoCalloutVisible = () => {
  cy.get(AI_RULE_CREATION_INFO_CALLOUT).should('be.visible');
};

export const assertProgressVisible = () => {
  cy.get(AI_RULE_CREATION_PROGRESS).should('be.visible');
};

export const assertUpdatesVisible = () => {
  cy.get(AI_RULE_CREATION_UPDATES).should('be.visible');
};

export const assertPromptTextareaEnabled = () => {
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).should('be.enabled');
};

export const assertRegenerateButtonVisible = () => {
  cy.get(AI_RULE_CREATION_REGENERATE_BUTTON).should('be.visible');
};

export const assertCancelButtonVisible = () => {
  cy.get(AI_RULE_CREATION_CANCEL_BUTTON).should('be.visible');
};

export const assertConnectorSelected = (connectorName: string) => {
  cy.get(AI_RULE_CREATION_CONNECTOR_SELECTOR).should('contain', connectorName);
};

export const clickBackToPromptLink = () => {
  cy.get(AI_RULE_CREATION_BACK_TO_PROMPT_LINK).should('exist').click();
};

export const assertPromptTextareaVisible = () => {
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA).should('be.visible');
};

export const assertPromptTextareaContains = (expectedPrompt: string) => {
  cy.get(AI_RULE_CREATION_PROMPT_TEXTAREA)
    .should('be.visible')
    .should('have.value', expectedPrompt);
};

export const assertEsqlQueryBarContains = (expectedQuery: string) => {
  cy.get(ESQL_QUERY_BAR).contains(expectedQuery);
};

export const assertCancelledCalloutVisible = () => {
  cy.get(AI_RULE_CREATION_CANCELLED_CALLOUT)
    .should('be.visible')
    .should('contain', 'The AI rule creation process was cancelled.');
};

export const clickNewAgentBuilderAttachmentButton = () => {
  cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible').click();
};

export const assertAgentBuilderConversationFlyoutVisible = () => {
  cy.get(AGENT_BUILDER_CONVERSATION_FLYOUT_WRAPPER).should('be.visible');
};

export const assertAgentBuilderConversationInputEditorContains = (expectedText: string) => {
  cy.get(AGENT_BUILDER_CONVERSATION_INPUT_EDITOR).should('contain', expectedText);
};

export const interceptAgentBuilderConverseAsync = ({
  mockResponse,
  alias = 'agentBuilderConverse',
  delay = 0,
}: {
  mockResponse: string;
  alias?: string;
  delay?: number;
}) => {
  cy.intercept('POST', '/api/agent_builder/converse/async', {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: mockResponse,
    delay,
  }).as(alias);
};
