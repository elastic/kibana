/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../../../objects/rule';

import {
  DEFINITION_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DETAILS_TITLE,
} from '../../../../screens/rule_details';

import {
  fillDefineIndicatorMatchRule,
  fillAlertSuppressionFields,
  selectIndicatorMatchType,
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
import { getDetails } from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const SUPPRESS_BY_FIELDS = ['myhash.mysha256', 'source.ip.keyword'];

describe(
  'Detection rules, Indicator Match, Alert Suppression',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    const rule = getNewThreatIndicatorRule();
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'threat_indicator' });
      cy.task('esArchiverLoad', { archiveName: 'suspicious_source_event' });
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);

      selectIndicatorMatchType();
      fillDefineIndicatorMatchRule(rule);
    });

    it('creates rule with per rule execution suppression', () => {
      // selecting only suppression fields, the rest options would be default
      fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);
      continueFromDefineStep();

      // ensures details preview works correctly
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
        getDetails(SUPPRESS_MISSING_FIELD).should(
          'have.text',
          'Suppress and group alerts for events with missing fields'
        );

        // suppression functionality should be under Tech Preview
        cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).contains('Technical Preview');
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
      });
    });

    it('creates rule rule with time interval suppression', () => {
      const expectedSuppressByFields = SUPPRESS_BY_FIELDS.slice(0, 1);

      // fill suppress by fields and select non-default suppression options
      fillAlertSuppressionFields(expectedSuppressByFields);
      selectAlertSuppressionPerInterval();
      setAlertSuppressionDuration(45, 'm');
      selectDoNotSuppressForMissingFields();
      continueFromDefineStep();

      // ensures details preview works correctly
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', expectedSuppressByFields.join(''));
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
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', expectedSuppressByFields.join(''));
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '45m');
        getDetails(SUPPRESS_MISSING_FIELD).should(
          'have.text',
          'Do not suppress alerts for events with missing fields'
        );
      });
    });
  }
);
