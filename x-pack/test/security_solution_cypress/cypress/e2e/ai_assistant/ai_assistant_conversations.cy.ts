/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_CHECKBOX } from '../../screens/timelines';
import { visitRulesManagementTable } from '../../tasks/rules_management';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { createRule } from '../../tasks/api_calls/rules';
import { getExistingRule } from '../../objects/rule';
import { login } from '../../tasks/login';
import {
  AI_ASSISTANT_BUTTON,
  CHAT_ICON,
  WELCOME_CONNECTOR_SETUP,
} from '../../screens/ai_assistant';
import { visitGetStartedPage } from '../../tasks/navigation';

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
      deleteAlertsAndRules();
      login();
    });
    it('Shows welcome setup when no connectors or conversations exist', () => {
      visitGetStartedPage();
      cy.get(AI_ASSISTANT_BUTTON).click();
      cy.get(WELCOME_CONNECTOR_SETUP).should('exist');
    });
    it.only('Shows welcome setup when no connectors or conversations exist when invoked from rules page', () => {
      createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
        visitRulesManagementTable();
        cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).should('exist');
        cy.get(TIMELINE_CHECKBOX(createdRule?.body?.id)).click();
        cy.get(CHAT_ICON).should('exist');
        cy.get(CHAT_ICON).click();
        cy.get(WELCOME_CONNECTOR_SETUP).should('exist');
      });
    });
  }
);
