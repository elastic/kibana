/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';

import {
  INDEX_SELECTOR,
  SLACK_ACTION_BTN,
  WEBHOOK_ACTION_BTN,
  EMAIL_ACTION_BTN,
  ACTION_BTN,
} from '../../../../screens/common/rule_actions';

import { createRule } from '../../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { goToActionsStepTab } from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';

import { editFirstRule } from '../../../../tasks/alerts_detection_rules';

import { visit } from '../../../../tasks/navigation';

const rule = getNewRule();

describe(
  'Rule actions PLI essentials product tier',
  {
    tags: ['@serverless'],

    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(rule);
    });

    it('only 3 rule actions should be available', () => {
      visit(RULES_MANAGEMENT_URL);
      editFirstRule();

      goToActionsStepTab();

      // only 3 basic actions available
      cy.get(ACTION_BTN).should('have.length', 3);

      cy.get(INDEX_SELECTOR).should('be.visible');
      cy.get(SLACK_ACTION_BTN).should('be.visible');
      cy.get(EMAIL_ACTION_BTN).should('be.visible');

      // webhook is not available
      cy.get(WEBHOOK_ACTION_BTN).should('not.exist');
    });
  }
);
