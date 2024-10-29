/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
  RULE_MANAGEMENT_CONTEXT_DESCRIPTION,
} from '@kbn/security-solution-plugin/public/detections/pages/detection_engine/rules/translations';
import { EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/user/translations';
import {
  assertConnectorSelected,
  assertNewConversation,
  closeAssistant,
  openAssistant,
  selectConnector,
  createNewChat,
  selectConversation,
  assertMessageSent,
  assertConversationTitle,
  typeAndSendMessage,
  assertErrorResponse,
  selectRule,
  updateConversationTitle,
} from '../../tasks/assistant';
import { deleteConversations } from '../../tasks/api_calls/assistant';
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

describe('AI Assistant Conversations', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    deleteAlertsAndRules();
    login();
  });
  describe('No connectors or conversations exist', () => {
    it('Shows welcome setup when no connectors or conversations exist', () => {
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(true, 'Welcome');
    });
  });
  describe('When no conversations exist but connectors do exist, show empty convo', () => {
    beforeEach(() => {
      createAzureConnector();
    });
    it('When invoked on AI Assistant click', () => {
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(false, 'Welcome');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      cy.get(USER_PROMPT).should('not.have.text');
    });
    it('When invoked from rules page', () => {
      createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
        visitRulesManagementTable();
        selectRule(createdRule?.body?.id);
        openAssistant('rule');
        assertNewConversation(false, 'Detection Rules');
        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(USER_PROMPT).should('have.text', EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS);
        cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', RULE_MANAGEMENT_CONTEXT_DESCRIPTION);
      });
    });
    it('When invoked from alert details', () => {
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      openAssistant('alert');
      assertNewConversation(false, 'Alert summary');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      cy.get(USER_PROMPT).should(
        'have.text',
        EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N
      );
      cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', 'Alert (from summary)');
    });
    it('Shows empty connector callout when a conversation that had a connector no longer does', () => {
      visitGetStartedPage();
      openAssistant();
      assertConnectorSelected(azureConnectorAPIPayload.name);
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
      assertNewConversation(false, 'Alert summary');
      closeAssistant();
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(false, 'Alert summary');
    });
    it('Properly switches back and forth between conversations', () => {
      visitGetStartedPage();
      openAssistant();
      assertNewConversation(false, 'Welcome');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      typeAndSendMessage('hello');
      assertMessageSent('hello');
      assertErrorResponse();
      selectConversation('Alert summary');
      selectConnector(bedrockConnectorAPIPayload.name);
      typeAndSendMessage('goodbye');
      assertMessageSent('goodbye');
      assertErrorResponse();
      selectConversation('Welcome');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      assertMessageSent('hello');
      selectConversation('Alert summary');
      assertConnectorSelected(bedrockConnectorAPIPayload.name);
      assertMessageSent('goodbye');
    });
    it('Correctly creates and titles new conversations, and allows title updates', () => {
      visitGetStartedPage();
      openAssistant();
      createNewChat();
      assertNewConversation(false, 'New chat');
      assertConnectorSelected(azureConnectorAPIPayload.name);
      typeAndSendMessage('hello');
      assertMessageSent('hello');
      assertConversationTitle('Unexpected API Error:  - Connection error.');
      updateConversationTitle('Something else');
    });
  });
});
