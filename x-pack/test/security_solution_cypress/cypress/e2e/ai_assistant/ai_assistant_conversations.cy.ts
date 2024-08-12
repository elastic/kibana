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
  assertConversation,
  closeAssistant,
  openAssistant,
} from '../../tasks/assistant';
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
  CONNECTOR_MISSING_CALLOUT,
  EMPTY_CONVO,
  PROMPT_CONTEXT_BUTTON,
  SYSTEM_PROMPT,
  USER_PROMPT,
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
        openAssistant();
        assertConversation(true, 'Welcome');
      });
      it('When invoked from rules page', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitRulesManagementTable();
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
          openAssistant('rule');
          assertConversation(true, 'Detection Rules');
        });
      });
      it('When invoked from alert details', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          expandFirstAlert();
          openAssistant('alert');
          assertConversation(true, 'Alert summary');
        });
      });
    });
    describe('Shows empty convo and selects default connector when no conversations exist but connectors do exist', () => {
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
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then(() => {
          visitWithTimeRange(ALERTS_URL);
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
      });
    });

    describe.only('Shows empty connector callout when a conversation that had a connector no longer does', () => {
      beforeEach(() => {
        createAzureConnector();
      });
      it('When invoked on AI Assistant click', () => {
        visitGetStartedPage();
        openAssistant();
        cy.get(EMPTY_CONVO).should('exist');
        assertConnectorSelected(azureConnectorAPIPayload.name);
        closeAssistant();
        deleteConnectors();
        openAssistant();
        cy.get(CONNECTOR_MISSING_CALLOUT).should('exist');
      });
      it('When invoked from rules page', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
          visitRulesManagementTable();
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
          cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
          openAssistant('rule');
          assertConnectorSelected(azureConnectorAPIPayload.name);
          closeAssistant();
          deleteConnectors();
          openAssistant();
          cy.get(CONNECTOR_MISSING_CALLOUT).should('exist');
        });
      });
      it('When invoked from alert details', () => {
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then(() => {
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          expandFirstAlert();
          openAssistant('alert');
          assertConnectorSelected(azureConnectorAPIPayload.name);
          closeAssistant();
          deleteConnectors();
          openAssistant();
          cy.get(CONNECTOR_MISSING_CALLOUT).should('exist');
        });
      });
    });
  }
);
