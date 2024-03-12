/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import { RULE_NAME_HEADER } from '../../../../screens/rule_details';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../../../screens/search_bar';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillScheduleRuleAndContinue,
  fillAboutRuleMinimumAndContinue,
  fillDefineCustomRuleAndContinue,
  createRuleWithoutEnabling,
  fillDefineCustomRule,
  openAddFilterPopover,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { fillAddFilterForm } from '../../../../tasks/search_bar';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
  });

  describe('Custom detection rules creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
    });

    it('Creates and enables a rule', function () {
      fillDefineCustomRuleAndContinue(rule);
      fillAboutRuleMinimumAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      cy.log('Asserting we have a new rule created');
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    });

    it('Adds filter on define step', () => {
      visit(CREATE_RULE_URL);
      fillDefineCustomRule(rule);
      openAddFilterPopover();
      fillAddFilterForm({
        key: 'host.name',
        operator: 'exists',
      });
      // Check that newly added filter exists
      cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', 'host.name: exists');
    });
  });
});
