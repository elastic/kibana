/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';

import { ESQL_QUERY_DETAILS, RULE_NAME_OVERRIDE_DETAILS } from '../../../../screens/rule_details';

import { ESQL_QUERY_BAR } from '../../../../screens/create_new_rule';

import { createRule } from '../../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  clearEsqlQueryBar,
  expandEsqlQueryBar,
  fillEsqlQueryBar,
  fillOverrideEsqlRuleName,
  goToAboutStepTab,
  expandAdvancedSettings,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';

import { editFirstRule } from '../../../../tasks/alerts_detection_rules';

import { saveEditedRule } from '../../../../tasks/edit_rule';
import { visit } from '../../../../tasks/navigation';

const rule = getEsqlRule();

const expectedValidEsqlQuery = 'from auditbeat* | stats count(event.category) by event.category';

describe('Detection ES|QL rules, edit', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    createRule(rule);
  });

  it('edits ES|QL rule and checks details page', () => {
    visit(RULES_MANAGEMENT_URL);
    editFirstRule();
    expandEsqlQueryBar();
    // ensure once edit form opened, correct query is displayed in ES|QL input
    cy.get(ESQL_QUERY_BAR).contains(rule.query);

    clearEsqlQueryBar();
    fillEsqlQueryBar(expectedValidEsqlQuery);

    saveEditedRule();

    // ensure updated query is displayed on details page
    getDetails(ESQL_QUERY_DETAILS).should('have.text', expectedValidEsqlQuery);
  });

  it('edits ES|QL rule query and override rule name with new property', () => {
    visit(RULES_MANAGEMENT_URL);
    editFirstRule();
    clearEsqlQueryBar();
    fillEsqlQueryBar(expectedValidEsqlQuery);

    goToAboutStepTab();
    expandAdvancedSettings();
    fillOverrideEsqlRuleName('event.category');

    saveEditedRule();

    // ensure rule name override is displayed on details page
    getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', 'event.category');
  });

  it('adds ES|QL override rule name on edit', () => {
    visit(RULES_MANAGEMENT_URL);
    editFirstRule();

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
});
