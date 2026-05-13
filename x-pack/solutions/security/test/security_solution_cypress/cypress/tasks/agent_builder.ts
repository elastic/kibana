/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NEW_AGENT_BUILDER_ATTACHMENT_BUTTON,
  AGENT_BUILDER_CONVERSATION_INPUT_EDITOR,
  AGENT_BUILDER_SIDEBAR_PANEL,
  CREATE_RULE_BUTTON,
  CREATE_RULE_CONTEXT_MENU_POPOVER,
  AI_RULE_CREATION_MENU_ITEM,
  MANUAL_RULE_CREATION_MENU_ITEM,
} from '../screens/agent_builder';

export const clickNewAgentBuilderAttachmentButton = () => {
  cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible').click();
};

export const assertAgentBuilderConversationInputEditorContains = (expectedText: string) => {
  cy.get(AGENT_BUILDER_CONVERSATION_INPUT_EDITOR).should('contain', expectedText);
};

export const openCreateRuleMenu = () => {
  cy.get(CREATE_RULE_BUTTON).should('be.visible').click();
  cy.get(CREATE_RULE_CONTEXT_MENU_POPOVER).should('be.visible');
};

export const clickAiRuleCreationMenuItem = () => {
  cy.get(AI_RULE_CREATION_MENU_ITEM).should('be.visible').click();
};

export const clickManualRuleCreationMenuItem = () => {
  cy.get(MANUAL_RULE_CREATION_MENU_ITEM).should('be.visible').click();
};

export const assertAgentBuilderSidebarIsOpen = () => {
  cy.get(AGENT_BUILDER_SIDEBAR_PANEL).should('be.visible');
};

export const assertAgentBuilderSidebarIsNotOpen = () => {
  cy.get(AGENT_BUILDER_SIDEBAR_PANEL).should('not.exist');
};
