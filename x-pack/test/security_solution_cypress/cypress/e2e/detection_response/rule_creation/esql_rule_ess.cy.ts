/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../objects/rule';

import { RULES_MANAGEMENT_TABLE, RULE_NAME } from '../../../screens/alerts_detection_rules';
import {
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RULE_NAME_OVERRIDE_DETAILS,
} from '../../../screens/rule_details';

import { ESQL_TYPE, ESQL_QUERY_BAR } from '../../../screens/create_new_rule';

import { getDetails, goBackToRulesTable } from '../../../tasks/rule_details';
import { expectNumberOfRules } from '../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import {
  fillAboutRuleAndContinue,
  fillDefineEsqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEsqlRuleType,
  getDefineContinueButton,
  fillEsqlQueryBar,
  fillAboutSpecificEsqlRuleAndContinue,
  createRuleWithoutEnabling,
} from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { CREATE_RULE_URL } from '../../../urls/navigation';

describe('Detection ES|QL rules, creation', { tags: ['@ess'] }, () => {
  const rule = getEsqlRule();
  const expectedNumberOfRules = 1;

  describe('creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
    });

    it('creates an ES|QL rule', function () {
      visit(CREATE_RULE_URL);

      selectEsqlRuleType();

      // ensures ES|QL rule in technical preview on create page
      cy.get(ESQL_TYPE).contains('Technical Preview');

      fillDefineEsqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      // ensures after rule save ES|QL rule is displayed
      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
      getDetails(RULE_TYPE_DETAILS).contains('ES|QL');

      // ensures newly created rule is displayed in table
      goBackToRulesTable();

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

      cy.get(RULE_NAME).should('have.text', rule.name);
    });

    // this test case is important, since field shown in rule override component are coming from ES|QL query, not data view fields API
    it('creates an ES|QL rule and overrides its name', function () {
      visit(CREATE_RULE_URL);

      selectEsqlRuleType();

      fillDefineEsqlRuleAndContinue(rule);
      fillAboutSpecificEsqlRuleAndContinue({ ...rule, rule_name_override: 'test_id' });
      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      // ensure rule name override is displayed on details page
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', 'test_id');
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/172074
  describe.skip('ES|QL query validation', () => {
    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
    });
    it('shows error when ES|QL query is empty', function () {
      selectEsqlRuleType();

      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('ES|QL query is required');
    });

    it('proceeds further once invalid query is fixed', function () {
      selectEsqlRuleType();

      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('required');

      // once correct query typed, we can proceed ot the next step
      fillEsqlQueryBar(rule.query);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).should('not.be.visible');
    });

    it('shows error when non-aggregating ES|QL query does not [metadata] operator', function () {
      const invalidNonAggregatingQuery = 'from auditbeat* | limit 5';
      selectEsqlRuleType();

      fillEsqlQueryBar(invalidNonAggregatingQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains(
        'must include the [metadata _id, _version, _index] operator after the source command'
      );
    });

    it('shows error when non-aggregating ES|QL query does not return _id field', function () {
      const invalidNonAggregatingQuery =
        'from auditbeat* [metadata _id, _version, _index] | keep agent.* | limit 5';

      selectEsqlRuleType();

      fillEsqlQueryBar(invalidNonAggregatingQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains(
        'must include the [metadata _id, _version, _index] operator after the source command'
      );
    });

    it('shows error when ES|QL query is invalid', function () {
      const invalidEsqlQuery =
        'from auditbeat* [metadata _id, _version, _index] | not_existing_operator';
      visit(CREATE_RULE_URL);

      selectEsqlRuleType();

      fillEsqlQueryBar(invalidEsqlQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('Error validating ES|QL');
    });
  });
});
