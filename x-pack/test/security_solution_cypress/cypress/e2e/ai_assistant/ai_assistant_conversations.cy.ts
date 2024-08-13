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
import { DEFAULT_SYSTEM_PROMPT_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/system/translations';
import {
  assertConnectorSelected,
  assertConversation,
  closeAssistant,
  openAssistant,
  selectConnector,
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
import { TIMELINE_CHECKBOX } from '../../screens/timelines';
import { visitRulesManagementTable } from '../../tasks/rules_management';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { createRule } from '../../tasks/api_calls/rules';
import { getExistingRule, getNewRule } from '../../objects/rule';
import { login } from '../../tasks/login';
import {
  CONNECTOR_MISSING_CALLOUT,
  CONVERSATION_MESSAGE,
  CONVERSATION_MESSAGE_ERROR,
  CONVERSATION_SELECT,
  CONVERSATION_TITLE,
  FLYOUT_NAV_TOGGLE,
  PROMPT_CONTEXT_BUTTON,
  SUBMIT_CHAT,
  SYSTEM_PROMPT,
  USER_PROMPT,
} from '../../screens/ai_assistant';
import { visit, visitGetStartedPage } from '../../tasks/navigation';

describe(
  'AI Assistant Conversations',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
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
        assertConversation(true, 'Welcome');
      });
    });
    describe('When no conversations exist but connectors do exist, show empty convo', () => {
      beforeEach(() => {
        createAzureConnector();
      });
      it('When invoked on AI Assistant click', () => {
        visitGetStartedPage();
        openAssistant();
        assertConversation(false, 'Welcome');
        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
        cy.get(USER_PROMPT).should('not.have.text');
      });
      it('When invoked from rules page', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitRulesManagementTable();
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
          openAssistant('rule');
          assertConversation(false, 'Detection Rules');
          assertConnectorSelected(azureConnectorAPIPayload.name);
          cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
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
        assertConversation(false, 'Alert summary');
        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
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
        cy.get(CONNECTOR_MISSING_CALLOUT).should('exist');
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
        assertConversation(false, 'Alert summary');
        closeAssistant();
        visitGetStartedPage();
        openAssistant();
        assertConversation(false, 'Alert summary');
      });
      it('Properly switches back and forth between conversations', () => {
        visitGetStartedPage();
        openAssistant();
        assertConversation(false, 'Welcome');

        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(USER_PROMPT).type('Hello world');
        cy.get(SUBMIT_CHAT).click();
        cy.get(CONVERSATION_MESSAGE)
          .first()
          .should('have.text', `${DEFAULT_SYSTEM_PROMPT_NON_I18N}\nHello world`);
        cy.get(CONVERSATION_MESSAGE_ERROR).should('exist');
        cy.get(FLYOUT_NAV_TOGGLE).click();
        cy.get(CONVERSATION_SELECT('Alert summary')).click();
        assertConversation(false, 'Alert summary');

        selectConnector(bedrockConnectorAPIPayload.name);
        cy.get(USER_PROMPT).type('Goodbye world');
        cy.get(SUBMIT_CHAT).click();
        cy.get(CONVERSATION_MESSAGE)
          .first()
          .should('have.text', `${DEFAULT_SYSTEM_PROMPT_NON_I18N}\nGoodbye world`);
        cy.get(CONVERSATION_MESSAGE_ERROR).should('exist');
        cy.get(CONVERSATION_SELECT('Welcome')).click();
        cy.get(CONVERSATION_TITLE).should('have.text', 'Welcome');
        assertConnectorSelected(azureConnectorAPIPayload.name);
        cy.get(CONVERSATION_MESSAGE)
          .first()
          .should('have.text', `${DEFAULT_SYSTEM_PROMPT_NON_I18N}\nHello world`);
        cy.get(CONVERSATION_SELECT('Alert summary')).click();
        cy.get(CONVERSATION_TITLE).should('have.text', 'Alert summary');
        assertConnectorSelected(bedrockConnectorAPIPayload.name);
        cy.get(CONVERSATION_MESSAGE)
          .first()
          .should('have.text', `${DEFAULT_SYSTEM_PROMPT_NON_I18N}\nGoodbye world`);
      });
    });
  }
);
