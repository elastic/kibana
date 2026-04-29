/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../../../objects/rule';

import {
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DEFINITION_DETAILS,
  INDICATOR_MAPPING,
} from '../../../../screens/rule_details';

import {
  ALERT_SUPPRESSION_DURATION_UNIT_INPUT,
  ALERT_SUPPRESSION_DURATION_VALUE_INPUT,
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS,
} from '../../../../screens/create_new_rule';

import { createRule } from '../../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';

import { editFirstRule, goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';

import { saveEditedRule } from '../../../../tasks/edit_rule';
import { goToRuleEditSettings } from '../../../../tasks/rule_details';
import {
  fillAlertSuppressionFields,
  selectAlertSuppressionPerRuleExecution,
  selectAlertSuppressionPerInterval,
  setAlertSuppressionDuration,
  fillIndicatorMatchRow,
  getIndicatorAndButton,
  getIndicatorDeleteButton,
} from '../../../../tasks/create_new_rule';
import { visit } from '../../../../tasks/navigation';

const SUPPRESS_BY_FIELDS = ['myhash.mysha256'];

const rule = getNewThreatIndicatorRule();

describe(
  'Detection rules, Indicator Match, Edit',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'threat_indicator' });
      cy.task('esArchiverLoad', { archiveName: 'suspicious_source_event' });
      login();
      deleteAlertsAndRules();
    });

    describe('without suppression', () => {
      beforeEach(() => {
        createRule(rule);
      });

      it('enables suppression on time interval', () => {
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();

        fillAlertSuppressionFields(SUPPRESS_BY_FIELDS, true);
        selectAlertSuppressionPerInterval();
        setAlertSuppressionDuration(2, 'h');

        saveEditedRule();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '2h');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Suppress and group alerts for events with missing fields'
          );
        });
      });
    });

    describe('with suppression configured', () => {
      beforeEach(() => {
        createRule({
          ...rule,
          alert_suppression: {
            group_by: SUPPRESS_BY_FIELDS,
            duration: { value: 360, unit: 's' },
            missing_fields_strategy: 'doNotSuppress',
          },
        });
      });

      it('displays suppress options correctly on edit form and allows its editing', () => {
        visit(RULES_MANAGEMENT_URL);
        goToRuleDetailsOf(rule.name);

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '360s');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });

        goToRuleEditSettings();

        // check saved suppression settings
        cy.get(ALERT_SUPPRESSION_DURATION_VALUE_INPUT)
          .should('be.enabled')
          .should('have.value', 360);
        cy.get(ALERT_SUPPRESSION_DURATION_UNIT_INPUT)
          .should('be.enabled')
          .should('have.value', 's');

        cy.get(ALERT_SUPPRESSION_FIELDS).should('contain', SUPPRESS_BY_FIELDS.join(''));
        cy.get(ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS).should('be.checked');

        // set new duration first to overcome some flaky racing conditions during form save
        setAlertSuppressionDuration(2, 'h');
        selectAlertSuppressionPerRuleExecution();

        saveEditedRule();

        // check execution duration has changed
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
        });
      });
    });

    describe('DOES NOT MATCH', () => {
      beforeEach(() => {
        createRule(rule);
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();
      });

      it('applies does not match settings', () => {
        getIndicatorAndButton().click();
        fillIndicatorMatchRow({
          rowNumber: 2,
          indexField: 'source.ip',
          indicatorIndexField: 'threat.indicator.ip',
          doesNotMatch: true,
        });

        saveEditedRule();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(INDICATOR_MAPPING).contains(
            'AND (source.ip DOES NOT MATCH threat.indicator.ip)'
          );
        });
      });

      it('shows error if single DOES NOT MATCH entry configured', () => {
        getIndicatorAndButton().click();
        fillIndicatorMatchRow({
          rowNumber: 2,
          indexField: 'source.ip',
          indicatorIndexField: 'threat.indicator.ip',
          doesNotMatch: true,
        });
        getIndicatorDeleteButton(1).click();

        cy.contains('Entries with AND clauses must have at least one MATCHES condition.');
      });

      it('shows error when 2 identical entries with different match operator configured', () => {
        getIndicatorAndButton().click();
        fillIndicatorMatchRow({
          rowNumber: 2,
          indexField: rule.threat_mapping[0].entries[0].field,
          indicatorIndexField: rule.threat_mapping[0].entries[0].value,
          doesNotMatch: true,
        });

        cy.contains(
          'DOES NOT MATCH and MATCHES entries that are connected by an AND clause cannot use the same threat mappings. Choose a different threat mapping for one of the entries.'
        );
      });
    });
  }
);
