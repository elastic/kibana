/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import {
  RULE_NAME_HEADER,
  DEFINITION_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DETAILS_TITLE,
} from '../../../../screens/rule_details';
import { ALERT_SUPPRESSION_FIELDS } from '../../../../screens/create_new_rule';
import { GLOBAL_SEARCH_BAR_FILTER_ITEM } from '../../../../screens/search_bar';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillScheduleRuleAndContinue,
  fillAboutRuleMinimumAndContinue,
  fillDefineCustomRuleAndContinue,
  createRuleWithoutEnabling,
  fillDefineCustomRule,
  openAddFilterPopover,
  fillAlertSuppressionFields,
  skipScheduleRuleAction,
  continueFromDefineStep,
  fillCustomQueryInput,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
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

    // FLAKEY - see https://github.com/elastic/kibana/issues/182891
    it('Adds filter on define step', { tags: ['@skipInServerless'] }, () => {
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

    // https://github.com/elastic/kibana/issues/187277
    describe('Alert suppression', { tags: ['@skipInServerlessMKI'] }, () => {
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
  });
});
