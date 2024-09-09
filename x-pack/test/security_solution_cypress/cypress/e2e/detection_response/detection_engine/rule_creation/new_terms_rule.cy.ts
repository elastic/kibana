/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewTermsRule } from '../../../../objects/rule';
import {
  DEFINITION_DETAILS,
  RULE_NAME_HEADER,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../screens/rule_details';

import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillAboutRuleAndContinue,
  fillDefineNewTermsRule,
  fillDefineNewTermsRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectNewTermsRuleType,
  fillAlertSuppressionFields,
  fillAboutRuleMinimumAndContinue,
  createRuleWithoutEnabling,
  skipScheduleRuleAction,
  continueFromDefineStep,
  selectAlertSuppressionPerInterval,
  setAlertSuppressionDuration,
  selectDoNotSuppressForMissingFields,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'New Terms rules',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    describe('Detection rules, New Terms', () => {
      const rule = getNewTermsRule();

      beforeEach(() => {
        deleteAlertsAndRules();
        login();
        visit(CREATE_RULE_URL);
        selectNewTermsRuleType();
      });

      it('Creates and enables a new terms rule', function () {
        cy.intercept('POST', /(\/api\/detection_engine\/rules)/).as('createNewTerm');

        fillDefineNewTermsRuleAndContinue(rule);
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createRuleWithoutEnabling();

        cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

        cy.wait('@createNewTerm').then(({ response }) => {
          cy.wrap(response?.body.history_window_start).should('eql', rule.history_window_start);
          cy.wrap(response?.body.new_terms_fields).should('eql', rule.new_terms_fields);
          cy.wrap(response?.body.index).should('eql', rule.index);
          cy.wrap(response?.body.query).should('eql', rule.query);
        });
      });

      it('Creates rule rule with time interval suppression', () => {
        const SUPPRESS_BY_FIELDS = ['agent.hostname', 'agent.type'];

        fillDefineNewTermsRule(rule);

        // fill suppress by fields and select non-default suppression options
        fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);
        selectAlertSuppressionPerInterval();
        setAlertSuppressionDuration(45, 'm');
        selectDoNotSuppressForMissingFields();
        continueFromDefineStep();

        // ensures details preview works correctly
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '45m');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });

        fillAboutRuleMinimumAndContinue(rule);
        skipScheduleRuleAction();
        createRuleWithoutEnabling();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '45m');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });
      });
    });
  }
);
