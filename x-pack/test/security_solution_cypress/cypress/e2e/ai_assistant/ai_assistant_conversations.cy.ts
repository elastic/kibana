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
import { deleteConversations } from '../../tasks/api_calls/assistant';
import { azureConnectorAPIPayload, createAzureConnector } from '../../tasks/api_calls/connectors';
import { expandFirstAlert } from '../../tasks/alerts';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { TIMELINE_CHECKBOX } from '../../screens/timelines';
import { visitRulesManagementTable } from '../../tasks/rules_management';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { createRule } from '../../tasks/api_calls/rules';
import { getExistingRule } from '../../objects/rule';
import { login } from '../../tasks/login';
import {
  AI_ASSISTANT_BUTTON,
  CHAT_ICON,
  CHAT_ICON_SM,
  CONNECTOR_SELECTOR,
  CONVERSATION_TITLE,
  EMPTY_CONVO,
  PROMPT_CONTEXT_BUTTON,
  SYSTEM_PROMPT,
  USER_PROMPT,
  WELCOME_SETUP,
} from '../../screens/ai_assistant';
import { visitGetStartedPage, visitWithTimeRange } from '../../tasks/navigation';

describe(
  'AI Assistant Conversations',
  {
    tags: ['@ess', '@serverless'],
    // env: {
    //   ftrConfig: {
    //     productTypes: [
    //       { product_line: 'security', product_tier: 'complete' },
    //       { product_line: 'endpoint', product_tier: 'complete' },
    //     ],
    //   },
    // },
  },
  () => {
    beforeEach(() => {
      deleteConnectors();
      deleteConversations();
      deleteAlertsAndRules();
      login();
    });
    describe('Shows welcome setup when no connectors or conversations exist', () => {
      it('When invoked on AI Assistant click', () => {
        visitGetStartedPage();
        cy.get(AI_ASSISTANT_BUTTON).click();
        cy.get(WELCOME_SETUP).should('exist');
        cy.get(CONVERSATION_TITLE).should('have.text', 'Welcome');
      });
      it('When invoked from rules page', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitRulesManagementTable();
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
          cy.get(CHAT_ICON).should('exist');
          cy.get(CHAT_ICON).click();
          cy.get(WELCOME_SETUP).should('exist');
          cy.get(CONVERSATION_TITLE).should('have.text', 'Detection Rules');
        });
      });
      it('When invoked from alert details', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          expandFirstAlert();
          cy.get(CHAT_ICON_SM).should('exist');
          cy.get(CHAT_ICON_SM).click();
          cy.get(WELCOME_SETUP).should('exist');
          cy.get(CONVERSATION_TITLE).should('have.text', 'Alert summary');
        });
      });
    });
    describe('Shows empty convo and selects default connector when no conversations exist but connectors do exist', () => {
      beforeEach(() => {
        createAzureConnector();
      });
      it('When invoked on AI Assistant click', () => {
        visitGetStartedPage();
        cy.get(AI_ASSISTANT_BUTTON).click();
        cy.get(EMPTY_CONVO).should('exist');
        cy.get(CONVERSATION_TITLE).should('have.text', 'Welcome');
        cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
        cy.get(CONNECTOR_SELECTOR).should('have.text', azureConnectorAPIPayload.name);
        cy.get(USER_PROMPT).should('not.have.text');
      });
      it('When invoked from rules page', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitRulesManagementTable();
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
          cy.get(CHAT_ICON).should('exist');
          cy.get(CHAT_ICON).click();
          cy.get(EMPTY_CONVO).should('exist');
          cy.get(CONVERSATION_TITLE).should('have.text', 'Detection Rules');
          cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
          cy.get(CONNECTOR_SELECTOR).should('have.text', azureConnectorAPIPayload.name);
          cy.get(USER_PROMPT).should('have.text', EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS);
          cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', RULE_MANAGEMENT_CONTEXT_DESCRIPTION);
        });
      });
      it('When invoked from alert details', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then(() => {
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          expandFirstAlert();
          cy.get(CHAT_ICON_SM).should('exist');
          cy.get(CHAT_ICON_SM).click();
          cy.get(EMPTY_CONVO).should('exist');
          cy.get(CONVERSATION_TITLE).should('have.text', 'Alert summary');
          cy.get(SYSTEM_PROMPT).should('have.text', 'Default system prompt');
          cy.get(CONNECTOR_SELECTOR).should('have.text', azureConnectorAPIPayload.name);
          cy.get(USER_PROMPT).should(
            'have.text',
            EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N
          );
          cy.get(PROMPT_CONTEXT_BUTTON(0)).should('have.text', 'Alert (from summary)');
        });
      });
    });
  }
);
