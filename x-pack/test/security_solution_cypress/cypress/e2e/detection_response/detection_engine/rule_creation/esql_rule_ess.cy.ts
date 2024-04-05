/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';

import {
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  INVESTIGATION_FIELDS_VALUE_ITEM,
} from '../../../../screens/alerts_detection_rules';
import {
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RULE_NAME_OVERRIDE_DETAILS,
} from '../../../../screens/rule_details';

import { ESQL_QUERY_BAR } from '../../../../screens/create_new_rule';

import { getDetails, goBackToRulesTable } from '../../../../tasks/rule_details';
import { expectNumberOfRules } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  expandEsqlQueryBar,
  fillAboutRuleAndContinue,
  fillDefineEsqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEsqlRuleType,
  getDefineContinueButton,
  fillEsqlQueryBar,
  fillAboutSpecificEsqlRuleAndContinue,
  createRuleWithoutEnabling,
  expandAdvancedSettings,
  fillCustomInvestigationFields,
  fillRuleName,
  fillDescription,
  getAboutContinueButton,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { CREATE_RULE_URL } from '../../../../urls/navigation';

// https://github.com/cypress-io/cypress/issues/22113
// issue is inside monaco editor, used in ES|QL query input
// calling it after visiting page in each tests, seems fixes the issue
// the only other alternative is patching ResizeObserver, which is something I would like to avoid
const workaroundForResizeObserver = () =>
  cy.on('uncaught:exception', (err) => {
    if (err.message.includes('ResizeObserver loop limit exceeded')) {
      return false;
    }
  });

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
      workaroundForResizeObserver();

      selectEsqlRuleType();
      expandEsqlQueryBar();

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
      workaroundForResizeObserver();

      selectEsqlRuleType();
      expandEsqlQueryBar();

      fillDefineEsqlRuleAndContinue(rule);
      fillAboutSpecificEsqlRuleAndContinue({ ...rule, rule_name_override: 'test_id' });
      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      // ensure rule name override is displayed on details page
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', 'test_id');
    });
  });

  describe('ES|QL query validation', () => {
    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
    });
    it('shows error when ES|QL query is empty', function () {
      workaroundForResizeObserver();

      selectEsqlRuleType();
      expandEsqlQueryBar();
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('ES|QL query is required');
    });

    it('proceeds further once invalid query is fixed', function () {
      workaroundForResizeObserver();

      selectEsqlRuleType();
      expandEsqlQueryBar();
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('required');

      // once correct query typed, we can proceed ot the next step
      fillEsqlQueryBar(rule.query);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).should('not.be.visible');
    });

    it('shows error when non-aggregating ES|QL query does not [metadata] operator', function () {
      workaroundForResizeObserver();

      const invalidNonAggregatingQuery = 'from auditbeat* | limit 5';
      selectEsqlRuleType();
      expandEsqlQueryBar();
      fillEsqlQueryBar(invalidNonAggregatingQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains(
        'must include the [metadata _id, _version, _index] operator after the source command'
      );
    });

    it('shows error when non-aggregating ES|QL query does not return _id field', function () {
      workaroundForResizeObserver();

      const invalidNonAggregatingQuery =
        'from auditbeat* [metadata _id, _version, _index] | keep agent.* | limit 5';

      selectEsqlRuleType();
      expandEsqlQueryBar();
      fillEsqlQueryBar(invalidNonAggregatingQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains(
        'must include the [metadata _id, _version, _index] operator after the source command'
      );
    });

    it('shows error when ES|QL query is invalid', function () {
      workaroundForResizeObserver();
      const invalidEsqlQuery =
        'from auditbeat* [metadata _id, _version, _index] | not_existing_operator';
      visit(CREATE_RULE_URL);

      selectEsqlRuleType();
      expandEsqlQueryBar();
      fillEsqlQueryBar(invalidEsqlQuery);
      getDefineContinueButton().click();

      cy.get(ESQL_QUERY_BAR).contains('Error validating ES|QL');
    });
  });

  describe('ES|QL investigation fields', () => {
    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
    });
    it('shows custom ES|QL field in investigation fields autocomplete and saves it in rule', function () {
      const CUSTOM_ESQL_FIELD = '_custom_agent_name';
      const queryWithCustomFields = [
        `from auditbeat* [metadata _id, _version, _index]`,
        `eval ${CUSTOM_ESQL_FIELD} = agent.name`,
        `keep _id, _custom_agent_name`,
        `limit 5`,
      ].join(' | ');

      workaroundForResizeObserver();

      selectEsqlRuleType();
      expandEsqlQueryBar();
      fillEsqlQueryBar(queryWithCustomFields);
      getDefineContinueButton().click();

      expandAdvancedSettings();
      fillRuleName();
      fillDescription();
      fillCustomInvestigationFields([CUSTOM_ESQL_FIELD]);
      getAboutContinueButton().click();

      fillScheduleRuleAndContinue(rule);
      createRuleWithoutEnabling();

      cy.get(INVESTIGATION_FIELDS_VALUE_ITEM).should('have.text', CUSTOM_ESQL_FIELD);
    });
  });
});
