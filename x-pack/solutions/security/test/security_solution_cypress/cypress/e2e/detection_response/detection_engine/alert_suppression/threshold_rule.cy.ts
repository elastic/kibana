/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThresholdRule } from '../../../../objects/rule';
import { DEFINITION_DETAILS, SUPPRESS_FOR_DETAILS } from '../../../../screens/rule_details';
import { goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

import {
  createRuleWithoutEnabling,
  fillAboutRuleMinimumAndContinue,
  enablesAndPopulatesThresholdSuppression,
  skipScheduleRuleAction,
  selectThresholdRuleType,
  fillDefineThresholdRule,
  continueFromDefineStep,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'Threshold Rule - Alert suppression',
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

    it('Creates a new threshold rule with suppression enabled', () => {
      selectThresholdRuleType();

      fillDefineThresholdRule(rule);
      enablesAndPopulatesThresholdSuppression(5, 'h');
      continueFromDefineStep();

      // ensures duration displayed on define step in preview mode
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '5h');
      });

      fillAboutRuleMinimumAndContinue(rule);
      skipScheduleRuleAction();
      createRuleWithoutEnabling();
      openRuleManagementPageViaBreadcrumbs();
      goToRuleDetailsOf(rule.name);

      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '5h');
      });
    });
  }
);
