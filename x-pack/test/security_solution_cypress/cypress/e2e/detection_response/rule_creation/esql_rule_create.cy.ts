/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../objects/rule';

import { RULES_MANAGEMENT_TABLE, RULE_NAME } from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER, RULE_TYPE_DETAILS } from '../../../screens/rule_details';

import {
  ESQL_TYPE,
  NEW_TERMS_TYPE,
  THRESHOLD_TYPE,
  ESQL_QUERY_BAR,
} from '../../../screens/create_new_rule';

import { getDetails, goBackToRulesTable } from '../../../tasks/rule_details';
import { expectNumberOfRules } from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  fillAboutRuleAndContinue,
  fillDefineEsqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEsqlRuleType,
  getDefineContinueButton,
  fillEsqlQueryBar,
  pressRuleCreateBtn,
} from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { CREATE_RULE_URL } from '../../../urls/navigation';
import { createRule } from '../../../tasks/api_calls/rules';

describe('Detection ES|QL rules, creation', { tags: ['@ess'] }, () => {
  before(() => {
    cleanKibana();
    login();
  });

  const rule = getEsqlRule();
  const expectedNumberOfRules = 1;

  describe('creation', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
    });

    it('creates an ES|QL rule', function () {
      visit(CREATE_RULE_URL);

      selectEsqlRuleType();

      // ensures ES|QL rule in technical preview on create page
      cy.get(ESQL_TYPE).contains('Technical Preview');

      fillDefineEsqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      pressRuleCreateBtn();

      // ensures after rule save ES|QL rule is displayed
      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
      getDetails(RULE_TYPE_DETAILS).contains('ES|QL');

      // ensures newly created rule is displayed in table
      goBackToRulesTable();

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

      cy.get(RULE_NAME).should('have.text', rule.name);
    });
  });

  describe('ES|QL query validation', () => {
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
        'write query that returns _id field from [metadata _id, _version, _index] operator'
      );
    });

    it('shows error when non-aggregating ES|QL query does not return _id field', function () {
      const invalidNonAggregatingQuery =
        'from auditbeat* [metadata _id, _version, _index] | keep agent.* | limit 5';

      selectEsqlRuleType();

      fillEsqlQueryBar(invalidNonAggregatingQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains(
        'write query that returns _id field from [metadata _id, _version, _index] operator'
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

describe('Detection ES|QL rules, creation', { tags: ['@serverless'] }, () => {
  before(() => {
    cleanKibana();
    login();
  });

  it('does not display ES|QL rule on form', function () {
    visit(CREATE_RULE_URL);

    // ensure, page is loaded and rule types are displayed
    cy.get(NEW_TERMS_TYPE).should('be.visible');
    cy.get(THRESHOLD_TYPE).should('be.visible');

    // ES|QL rule tile should not be rendered
    cy.get(ESQL_TYPE).should('not.exist');
  });

  it('does not allow to create rule by API call', function () {
    createRule(getEsqlRule()).then((response) => {
      expect(response.status).to.equal(400);

      expect(response.body).to.deep.equal({
        status_code: 400,
        message: 'Rule type "siem.esqlRule" is not registered.',
      });
    });
  });
});
