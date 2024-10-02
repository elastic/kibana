/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';

import {
  ESQL_QUERY_DETAILS,
  RULE_NAME_OVERRIDE_DETAILS,
  SUPPRESS_FOR_DETAILS,
  DEFINITION_DETAILS,
  SUPPRESS_MISSING_FIELD,
  SUPPRESS_BY_DETAILS,
  DETAILS_TITLE,
} from '../../../../screens/rule_details';

import {
  ESQL_QUERY_BAR,
  ALERT_SUPPRESSION_DURATION_INPUT,
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS,
} from '../../../../screens/create_new_rule';

import { createRule } from '../../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  expandEsqlQueryBar,
  fillEsqlQueryBar,
  fillOverrideEsqlRuleName,
  goToAboutStepTab,
  expandAdvancedSettings,
  selectAlertSuppressionPerRuleExecution,
  selectDoNotSuppressForMissingFields,
  fillAlertSuppressionFields,
  interceptEsqlQueryFieldsRequest,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';

import { editFirstRule } from '../../../../tasks/alerts_detection_rules';

import { saveEditedRule } from '../../../../tasks/edit_rule';
import { visit } from '../../../../tasks/navigation';

const rule = getEsqlRule();

const expectedValidEsqlQuery =
  'from auditbeat* | stats _count=count(event.category) by event.category';

describe(
  'Detection ES|QL rules, edit',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(rule);

      visit(RULES_MANAGEMENT_URL);
      editFirstRule();
    });

    it('edits ES|QL rule and checks details page', () => {
      expandEsqlQueryBar();
      // ensure once edit form opened, correct query is displayed in ES|QL input
      cy.get(ESQL_QUERY_BAR).contains(rule.query);

      fillEsqlQueryBar(expectedValidEsqlQuery);

      saveEditedRule();

      // ensure updated query is displayed on details page
      getDetails(ESQL_QUERY_DETAILS).should('have.text', expectedValidEsqlQuery);
    });

    it('edits ES|QL rule query and override rule name with new property', () => {
      fillEsqlQueryBar(expectedValidEsqlQuery);

      goToAboutStepTab();
      expandAdvancedSettings();
      fillOverrideEsqlRuleName('event.category');

      saveEditedRule();

      // ensure rule name override is displayed on details page
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', 'event.category');
    });

    it('adds ES|QL override rule name on edit', () => {
      expandEsqlQueryBar();
      // ensure once edit form opened, correct query is displayed in ES|QL input
      cy.get(ESQL_QUERY_BAR).contains(rule.query);

      goToAboutStepTab();
      expandAdvancedSettings();
      // this field defined to be returned in rule query
      fillOverrideEsqlRuleName('test_id');

      saveEditedRule();

      // ensure rule name override is displayed on details page
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', 'test_id');
    });

    describe('with configured suppression', () => {
      const SUPPRESS_BY_FIELDS = ['event.category'];
      const NEW_SUPPRESS_BY_FIELDS = ['event.category', '_count'];

      beforeEach(() => {
        deleteAlertsAndRules();
        createRule({
          ...rule,
          query: expectedValidEsqlQuery,
          alert_suppression: {
            group_by: SUPPRESS_BY_FIELDS,
            duration: { value: 3, unit: 'h' },
            missing_fields_strategy: 'suppress',
          },
        });
      });

      it('displays suppress options correctly on edit form and allows its editing', () => {
        visit(RULES_MANAGEMENT_URL);

        interceptEsqlQueryFieldsRequest(expectedValidEsqlQuery, 'esqlSuppressionFieldsRequest');
        editFirstRule();

        // check saved suppression settings
        cy.get(ALERT_SUPPRESSION_DURATION_INPUT).eq(0).should('be.enabled').should('have.value', 3);
        cy.get(ALERT_SUPPRESSION_DURATION_INPUT)
          .eq(1)
          .should('be.enabled')
          .should('have.value', 'h');
        cy.get(ALERT_SUPPRESSION_FIELDS).should('contain', SUPPRESS_BY_FIELDS.join(''));
        cy.get(ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS).should('be.checked');

        selectAlertSuppressionPerRuleExecution();
        selectDoNotSuppressForMissingFields();

        cy.wait('@esqlSuppressionFieldsRequest');
        fillAlertSuppressionFields(['_count']);

        saveEditedRule();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', NEW_SUPPRESS_BY_FIELDS.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });
      });
    });

    describe('without suppression', () => {
      const SUPPRESS_BY_FIELDS = ['event.category'];

      beforeEach(() => {
        deleteAlertsAndRules();
        createRule({
          ...rule,
          query: expectedValidEsqlQuery,
        });
      });

      it('enables suppression on time interval', () => {
        visit(RULES_MANAGEMENT_URL);

        interceptEsqlQueryFieldsRequest(expectedValidEsqlQuery, 'esqlSuppressionFieldsRequest');
        editFirstRule();

        cy.wait('@esqlSuppressionFieldsRequest');
        fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);

        saveEditedRule();

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
      });
    });
  }
);
