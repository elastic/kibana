/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { getNewRule } from '../../../../../objects/rule';

import { RULE_SWITCH } from '../../../../../screens/alerts_detection_rules';

import {
  deleteFirstRule,
  disableAutoRefresh,
  getRulesManagementTableRows,
  selectRulesByName,
} from '../../../../../tasks/alerts_detection_rules';
import { deleteSelectedRules } from '../../../../../tasks/rules_bulk_actions';
import { createRule, findAllRules } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { login } from '../../../../../tasks/login';

describe('Rule deletion', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
  const testRules = [
    getNewRule({ rule_id: 'rule1', name: 'Rule 1', enabled: false }),
    getNewRule({ rule_id: 'rule2', name: 'Rule 2', enabled: false }),
    getNewRule({ rule_id: 'rule3', name: 'Rule 3', enabled: false }),
  ];
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(testRules[0]);
    createRule(testRules[1]);
    createRule(testRules[2]);
    login();
    visitRulesManagementTable();
    disableAutoRefresh();
  });

  it('User can delete an individual rule', () => {
    getRulesManagementTableRows().then((rules) => {
      const initialNumberOfRules = rules.length;
      const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

      findAllRules().then(({ body }) => {
        const numberOfRules = body.data.length;
        expect(numberOfRules).to.eql(initialNumberOfRules);
      });

      deleteFirstRule();

      getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
      findAllRules().then(({ body }) => {
        const numberOfRules = body.data.length;
        expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
      });
    });
  });

  it('User can delete multiple selected rules via a bulk action', () => {
    getRulesManagementTableRows().then((rules) => {
      const rulesToDelete = ['Rule 1', 'Rule 2'] as const;
      const initialNumberOfRules = rules.length;
      const numberOfRulesToBeDeleted = 2;
      const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - numberOfRulesToBeDeleted;

      selectRulesByName(rulesToDelete);
      deleteSelectedRules();

      // During deletion, rule switch is not shown and instead there's loading spinner
      getRulesManagementTableRows()
        .first()
        .within(() => {
          cy.get(RULE_SWITCH).should('not.exist');
        });

      getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
      findAllRules().then(({ body }) => {
        const numberOfRules = body.data.length;
        expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
      });

      // Once bulk delete is done and one rule remains, checking for enable/disable switch to exist
      getRulesManagementTableRows()
        .first()
        .within(() => {
          cy.get(RULE_SWITCH).should('exist');
        });
    });
  });
});
