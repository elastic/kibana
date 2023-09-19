/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRuleOnly,
  fillScheduleRuleAndContinue,
  fillAboutRuleMinimumAndContinue,
  fillDefineCustomRuleAndContinue,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import { RULE_CREATION } from '../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
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
      fillAboutRuleMinimumAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRuleOnly();

      cy.log('Asserting we have a new rule created');
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    });
  });
});
