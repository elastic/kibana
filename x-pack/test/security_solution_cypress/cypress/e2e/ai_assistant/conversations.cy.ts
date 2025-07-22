/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_MANAGEMENT_CONTEXT_DESCRIPTION } from '@kbn/security-solution-plugin/public/detection_engine/common/translations';
import { IS_SERVERLESS } from '../../env_var_names_constants';
import {
  assertConnectorSelected,
  assertConversationTitleContains,
  assertErrorResponse,
  assertMessageSent,
  assertNewConversation,
  closeAssistant,
  createAndTitleConversation,
  createOpenAIConnector,
  openAssistant,
  selectConnector,
  selectConversation,
  selectRule,
  submitMessage,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { deleteConversations, waitForConversation } from '../../tasks/api_calls/assistant';
import {
  azureConnectorAPIPayload,
  bedrockConnectorAPIPayload,
  createAzureConnector,
  createBedrockConnector,
} from '../../tasks/api_calls/connectors';
import { expandFirstAlert } from '../../tasks/alerts';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { visitRulesManagementTable } from '../../tasks/rules_management';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { createRule } from '../../tasks/api_calls/rules';
import { getExistingRule, getNewRule } from '../../objects/rule';
import { login } from '../../tasks/login';
import {
  CONNECTOR_MISSING_CALLOUT,
  PROMPT_CONTEXT_BUTTON,
  USER_PROMPT,
} from '../../screens/ai_assistant';
import { visit, visitGetStartedPage } from '../../tasks/navigation';

const mockConvo1 = {
  id: 'spooky',
  title: 'Spooky convo',
  messages: [],
};
const mockConvo2 = {
  id: 'silly',
  title: 'Silly convo',
  messages: [],
};
describe('AI Assistant Conversations', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    deleteAlertsAndRules();
    login(Cypress.env(IS_SERVERLESS) ? 'admin' : undefined);
    waitForConversation(mockConvo1);
    waitForConversation(mockConvo2);
  });
  // On serverless we provide default .inference `Elastic LLM` connector
  describe('No connectors or conversations exist', { tags: ['@skipInServerless'] }, () => {
    it('Shows welcome setup when no connectors or conversations exist', () => {
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(true, 'New chat');
    });
    it('Creating a new connector from welcome setup automatically sets the connector for the conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createOpenAIConnector('My OpenAI Connector');
      assertConnectorSelected('My OpenAI Connector');
    });
  });
  describe('When no conversations exist but connectors do exist, show empty convo', () => {
    beforeEach(() => {
      createAzureConnector();
    });
    it('When invoked on AI Assistant click', () => {
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(false, 'New chat');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      cy.get(USER_PROMPT).should('not.have.text');
    });
    it('When invoked from rules page', () => {
      createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
        visitRulesManagementTable();
        cy.log('NEW RULE', createdRule);
        selectRule(createdRule?.body?.id);
        openAssistant('rule');
        assertNewConversation(false, `Detection Rules - Rule 1`);
        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', RULE_MANAGEMENT_CONTEXT_DESCRIPTION);
      });
    });
    it('When invoked from alert details', () => {
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      openAssistant('alert');
      assertConversationTitleContains('New Rule Test');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', 'Alert (from summary)');
    });
    it('Shows empty connector callout when a conversation that had a connector no longer does', () => {
      visitGetStartedPage();
      openAssistant();
      selectConversation(mockConvo1.title);
      selectConnector(azureConnectorAPIPayload.name);
      closeAssistant();
      deleteConnectors();
      openAssistant();
      cy.get(CONNECTOR_MISSING_CALLOUT).should('be.visible');
    });
  });
  describe('Changing conversations', () => {
    beforeEach(() => {
      createAzureConnector();
      createBedrockConnector();
    });

    it('Last conversation persists in memory from page to page', () => {
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      openAssistant('alert');
      assertConversationTitleContains('New Rule Test');
      // send message to ensure conversation is created
      submitMessage();
      closeAssistant();
      visitGetStartedPage();
      openAssistant();
      assertConversationTitleContains('New Rule Test');
    });
    it('Properly switches back and forth between conversations', () => {
      visitGetStartedPage();
      openAssistant();
      selectConversation(mockConvo1.title);
      selectConnector(azureConnectorAPIPayload.name);
      typeAndSendMessage('hello');
      assertMessageSent('hello');
      assertErrorResponse();
      selectConversation(mockConvo2.title);
      selectConnector(bedrockConnectorAPIPayload.name);
      typeAndSendMessage('goodbye');
      assertMessageSent('goodbye');
      assertErrorResponse();
      selectConversation(mockConvo1.title);
      assertConnectorSelected(azureConnectorAPIPayload.name);
      assertMessageSent('hello');
      selectConversation(mockConvo2.title);
      assertConnectorSelected(bedrockConnectorAPIPayload.name);
      assertMessageSent('goodbye');
    });
    it('Correctly creates and titles new conversations, and allows title updates', () => {
      visitGetStartedPage();
      openAssistant();
      createAndTitleConversation('Something else');
    });
  });
});
