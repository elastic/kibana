/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIRST_RULE,
  RULE_NAME,
  RULE_SWITCH,
  SECOND_RULE,
  FOURTH_RULE,
  RULES_MANAGEMENT_TABLE,
} from '../../../../screens/alerts_detection_rules';
import {
  enableRule,
  getRulesManagementTableRows,
  waitForRuleToUpdate,
} from '../../../../tasks/alerts_detection_rules';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  getExistingRule,
  getNewOverrideRule,
  getNewRule,
  getNewThresholdRule,
} from '../../../../objects/rule';
import {
  goToTablePage,
  setRowsPerPageTo,
  sortByTableColumn,
} from '../../../../tasks/table_pagination';
import { TABLE_FIRST_PAGE, TABLE_SECOND_PAGE } from '../../../../screens/table_pagination';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe('Rules table: sorting', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: '1', enabled: false }));
    createRule(getExistingRule({ rule_id: '2', enabled: false }));
    createRule(getNewOverrideRule({ rule_id: '3', enabled: false }));
    createRule(getNewThresholdRule({ rule_id: '4', enabled: false }));
  });

  it('Sorts by enabled rules', () => {
    visit(RULES_MANAGEMENT_URL);

    enableRule(SECOND_RULE);
    waitForRuleToUpdate();
    enableRule(FOURTH_RULE);
    waitForRuleToUpdate();

    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(FOURTH_RULE).should('have.attr', 'role', 'switch');

    sortByTableColumn('Enabled', 'desc');

    cy.get(RULE_SWITCH).eq(FIRST_RULE).should('have.attr', 'role', 'switch');
    cy.get(RULE_SWITCH).eq(SECOND_RULE).should('have.attr', 'role', 'switch');
  });

  it('Pagination updates page number and results', () => {
    createRule(getNewRule({ name: 'Test a rule', rule_id: '5', enabled: false }));
    createRule(getNewRule({ name: 'Not same as first rule', rule_id: '6', enabled: false }));

    visit(RULES_MANAGEMENT_URL);
    setRowsPerPageTo(5);

    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_FIRST_PAGE).should('have.attr', 'aria-current');

    cy.get(RULES_MANAGEMENT_TABLE)
      .find(RULE_NAME)
      .first()
      .invoke('text')
      .then((ruleNameFirstPage) => {
        goToTablePage(2);
        // Check that the rules table shows at least one row
        getRulesManagementTableRows().should('have.length.gte', 1);
        // Check that the rules table doesn't show the rule from the first page
        cy.get(RULES_MANAGEMENT_TABLE).should('not.contain', ruleNameFirstPage);
      });

    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_FIRST_PAGE).should('not.have.attr', 'aria-current');
    cy.get(RULES_MANAGEMENT_TABLE).find(TABLE_SECOND_PAGE).should('have.attr', 'aria-current');
  });
});
