/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThresholdRule } from '../../../../objects/rule';
import { RULE_NAME_HEADER } from '../../../../screens/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

import {
  createRuleWithoutEnabling,
  fillAboutRuleAndContinue,
  fillDefineThresholdRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectThresholdRuleType,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'Threshold Rule - Rule Creation',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    const rule = getNewThresholdRule();

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
    });

    it('Creates and enables a new threshold rule', () => {
      selectThresholdRuleType();
      fillDefineThresholdRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      cy.log('Asserting we have a new rule created');
      cy.get(RULE_NAME_HEADER).should('contain', rule.name);
    });
  }
);
