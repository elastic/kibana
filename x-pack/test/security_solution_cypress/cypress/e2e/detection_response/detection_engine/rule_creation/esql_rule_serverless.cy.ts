/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';

import { ESQL_TYPE, NEW_TERMS_TYPE, THRESHOLD_TYPE } from '../../../../screens/create_new_rule';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { createRule } from '../../../../tasks/api_calls/rules';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe('Detection ES|QL rules, creation', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
    login();
  });

  it('should display ES|QL rule on form', function () {
    visit(CREATE_RULE_URL);

    // ensure, page is loaded and rule types are displayed
    cy.get(NEW_TERMS_TYPE).should('be.visible');
    cy.get(THRESHOLD_TYPE).should('be.visible');

    cy.get(ESQL_TYPE).should('exist');
  });

  it('allow creation rule by API call', function () {
    createRule(getEsqlRule()).then((response) => {
      expect(response.status).to.equal(200);
    });
  });
});
