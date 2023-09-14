/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RULE_NAME,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
} from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { goToRuleDetailsOf } from '../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillScheduleRuleAndContinue,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import { RULE_CREATION } from '../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
  const expectedNumberOfRules = 1;
  const rule = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
  });

  describe('Custom detection rules creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
    });

    it('Creates and enables a rule', function () {
      visit(RULE_CREATION);
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();

      cy.log('Asserting we have a new rule created');
      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.log('Asserting rule view in rules list');
      cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
      cy.get(RULE_NAME).should('have.text', rule.name);

      goToRuleDetailsOf(rule.name);

      cy.log('Asserting rule details');
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    });
  });
});
