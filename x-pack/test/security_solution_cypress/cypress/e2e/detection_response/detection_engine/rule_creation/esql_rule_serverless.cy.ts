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

import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';

describe('Detection ES|QL rules, creation', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
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
