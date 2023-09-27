/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../objects/rule';

import { CUSTOM_QUERY_DETAILS } from '../../../screens/rule_details';

import { ESQL_QUERY_BAR } from '../../../screens/create_new_rule';

import { createRule } from '../../../tasks/api_calls/rules';

import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import { getDetails } from '../../../tasks/rule_details';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { clearEsqlQueryBar, fillEsqlQueryBar } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';

import { editFirstRule } from '../../../tasks/alerts_detection_rules';

import { saveEditedRule } from '../../../tasks/edit_rule';
import { visit } from '../../../tasks/navigation';

const rule = getEsqlRule();

const expectedValidEsqlQuery = 'from auditbeat* | stats count(event.category) by event.category';

describe('Detection ES|QL rules, edit', { tags: ['@ess'] }, () => {
  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(rule);
  });

  it('edits ES|QL rule and checks details page', () => {
    visit(RULES_MANAGEMENT_URL);
    editFirstRule();

    // ensure once edit form opened, correct query is displayed in ES|QL input
    cy.get(ESQL_QUERY_BAR).contains(rule.query);

    clearEsqlQueryBar();
    fillEsqlQueryBar(expectedValidEsqlQuery);

    saveEditedRule();

    // ensure updated query is displayed on details page
    getDetails(CUSTOM_QUERY_DETAILS).should('have.text', expectedValidEsqlQuery);
  });
});
