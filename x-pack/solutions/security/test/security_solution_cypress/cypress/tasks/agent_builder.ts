/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NEW_AGENT_BUILDER_ATTACHMENT_BUTTON,
  AGENT_BUILDER_CONVERSATION_INPUT_EDITOR,
} from '../screens/agent_builder';

export const clickNewAgentBuilderAttachmentButton = () => {
  cy.get(NEW_AGENT_BUILDER_ATTACHMENT_BUTTON).should('be.visible').click();
};

export const assertAgentBuilderConversationInputEditorContains = (expectedText: string) => {
  cy.get(AGENT_BUILDER_CONVERSATION_INPUT_EDITOR).should('contain', expectedText);
};
