/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlRule } from '../../../../objects/rule';

import {
  ESQL_QUERY_DETAILS,
  DEFINITION_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
} from '../../../../screens/rule_details';

import { createRule } from '../../../../tasks/api_calls/rules';

import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { ruleDetailsUrl } from '../../../../urls/rule_details';

describe('Detection ES|QL rules, details view', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getEsqlRule();

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
  });

  it('displays ES|QL rule specific fields', function () {
    createRule(getEsqlRule()).then((createdRule) => {
      visit(ruleDetailsUrl(createdRule.body.id));

      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);

      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(ESQL_QUERY_DETAILS).should('have.text', rule.query);

        getDetails(RULE_TYPE_DETAILS).contains('ES|QL');
      });
    });
  });
});
