/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import {
  DEFINITION_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DETAILS_TITLE,
} from '../../../../screens/rule_details';
import { ALERT_SUPPRESSION_FIELDS } from '../../../../screens/create_new_rule';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillAboutRuleMinimumAndContinue,
  createRuleWithoutEnabling,
  fillAlertSuppressionFields,
  skipScheduleRuleAction,
  continueFromDefineStep,
  fillCustomQueryInput,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe('Custom Query Rule - Alert suppression', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  const SUPPRESS_BY_FIELDS = ['source.ip'];

  it('creates rule with suppression', () => {
    fillCustomQueryInput('*');
    fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);
    // alert suppression fields input should not have Technical Preview label
    cy.get(ALERT_SUPPRESSION_FIELDS).should('not.contain.text', 'Technical Preview');
    continueFromDefineStep();

    // ensures details preview works correctly
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
      getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
      getDetails(SUPPRESS_MISSING_FIELD).should(
        'have.text',
        'Suppress and group alerts for events with missing fields'
      );

      // suppression functionality should be in GA
      cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).should(
        'not.contain.text',
        'Technical Preview'
      );
    });

    fillAboutRuleMinimumAndContinue(rule);
    skipScheduleRuleAction();
    createRuleWithoutEnabling();

    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
      getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
      getDetails(SUPPRESS_MISSING_FIELD).should(
        'have.text',
        'Suppress and group alerts for events with missing fields'
      );

      // suppression functionality should be in GA
      cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).should(
        'not.contain.text',
        'Technical Preview'
      );
    });
  });
});
