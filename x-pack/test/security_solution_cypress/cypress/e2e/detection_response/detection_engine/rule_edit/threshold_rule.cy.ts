/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThresholdRule } from '../../../../objects/rule';

import {
  SUPPRESS_FOR_DETAILS,
  DETAILS_TITLE,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../screens/rule_details';

import {
  ALERT_SUPPRESSION_DURATION_INPUT,
  THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX,
  ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION,
  ALERT_SUPPRESSION_DURATION_PER_TIME_INTERVAL,
  ALERT_SUPPRESSION_FIELDS,
} from '../../../../screens/create_new_rule';

import { createRule } from '../../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { getDetails, assertDetailsNotExist } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';

import { editFirstRule } from '../../../../tasks/alerts_detection_rules';

import { saveEditedRule, goBackToRuleDetails } from '../../../../tasks/edit_rule';
import { enablesAndPopulatesThresholdSuppression } from '../../../../tasks/create_new_rule';
import { visit } from '../../../../tasks/navigation';

const rule = getNewThresholdRule();

describe(
  'Detection threshold rules, edit',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    describe('without suppression', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        createRule(rule);
      });

      it('enables suppression on time interval', () => {
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();

        // suppression fields are hidden since threshold fields used for suppression
        cy.get(ALERT_SUPPRESSION_FIELDS).should('not.be.visible');

        enablesAndPopulatesThresholdSuppression(60, 'm');

        saveEditedRule();

        // ensure typed interval is displayed on details page
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '60m');
        // suppression functionality should be under Tech Preview
        cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).contains('Technical Preview');

        // the rest of suppress properties do not exist for threshold rule
        assertDetailsNotExist(SUPPRESS_BY_DETAILS);
        assertDetailsNotExist(SUPPRESS_MISSING_FIELD);
      });
    });

    describe('with suppression enabled', () => {
      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        createRule({ ...rule, alert_suppression: { duration: { value: 360, unit: 's' } } });
      });

      it('displays suppress options correctly on edit form', () => {
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();

        cy.get(ALERT_SUPPRESSION_DURATION_PER_TIME_INTERVAL)
          .should('be.enabled')
          .should('be.checked');
        cy.get(ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION)
          .should('be.disabled')
          .should('not.be.checked');

        // ensures enable suppression checkbox is checked and suppression options displayed correctly
        cy.get(THRESHOLD_ENABLE_SUPPRESSION_CHECKBOX).should('be.enabled').should('be.checked');
        cy.get(ALERT_SUPPRESSION_DURATION_INPUT)
          .eq(0)
          .should('be.enabled')
          .should('have.value', 360);
        cy.get(ALERT_SUPPRESSION_DURATION_INPUT)
          .eq(1)
          .should('be.enabled')
          .should('have.value', 's');

        goBackToRuleDetails();
        // no changes on rule details page
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '360s');
      });
    });
  }
);
