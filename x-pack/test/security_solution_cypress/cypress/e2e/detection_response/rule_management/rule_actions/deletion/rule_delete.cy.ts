/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule, getExistingRule, getNewOverrideRule } from '../../../../../objects/rule';

import { CUSTOM_RULES_BTN, RULE_SWITCH } from '../../../../../screens/alerts_detection_rules';

import {
  deleteFirstRule,
  getRulesManagementTableRows,
  selectRulesByName,
} from '../../../../../tasks/alerts_detection_rules';
import { deleteSelectedRules } from '../../../../../tasks/rules_bulk_actions';
import { createRule, findAllRules } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/common';
import { login, visitSecurityDetectionRulesPage } from '../../../../../tasks/login';

describe('Rule deletion', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  const TESTED_RULE_DATA = getNewRule({
    rule_id: 'rule1',
    name: 'New Rule Test',
    enabled: false,
    max_signals: 500,
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(TESTED_RULE_DATA);
    createRule(
      getNewOverrideRule({
        rule_id: 'rule2',
        name: 'Override Rule',
        enabled: false,
        max_signals: 500,
      })
    );
    createRule(getExistingRule({ rule_id: 'rule3', name: 'Rule 1', enabled: false }));
    login();
    visitSecurityDetectionRulesPage();
  });

  it('Deletes one rule', () => {
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
      cy.get(CUSTOM_RULES_BTN).should(
        'have.text',
        `Custom rules (${expectedNumberOfRulesAfterDeletion})`
      );
    });
  });

  it('Deletes more than one rule', () => {
    getRulesManagementTableRows().then((rules) => {
      const rulesToDelete = [TESTED_RULE_DATA.name, 'Override Rule'] as const;
      const initialNumberOfRules = rules.length;
      const numberOfRulesToBeDeleted = 2;
      const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - numberOfRulesToBeDeleted;

      selectRulesByName(rulesToDelete);
      deleteSelectedRules();

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
      getRulesManagementTableRows()
        .first()
        .within(() => {
          cy.get(RULE_SWITCH).should('exist');
        });
      cy.get(CUSTOM_RULES_BTN).should(
        'have.text',
        `Custom rules (${expectedNumberOfRulesAfterDeletion})`
      );
    });
  });
});
