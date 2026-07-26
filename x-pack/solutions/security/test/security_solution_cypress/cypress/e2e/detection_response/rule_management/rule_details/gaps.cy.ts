/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installMockPrebuiltRulesPackage } from '../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { createRule } from '../../../../tasks/api_calls/rules';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import {
  filterGapsByStatus,
  getGapsTableRows,
  refreshGapsTable,
  waitForPageToBeLoaded,
} from '../../../../tasks/rule_details';
import { getNewRule } from '../../../../objects/rule';
import {
  RULE_GAPS_FILL_BUTTON,
  RULE_GAPS_INFO,
  RULE_GAPS_TABLE,
  RULE_SWITCH,
} from '../../../../screens/rule_details';
import {
  interceptFillGap,
  interceptGetRuleGaps,
  interceptGetRuleGapsNoData,
} from '../../../../tasks/api_calls/gaps';
import { TOOLTIP } from '../../../../screens/common';

describe('Rule gaps', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, function () {
  before(() => {
    installMockPrebuiltRulesPackage();
  });

  before(() => {
    login();
    deleteAlertsAndRules();
    createRule(getNewRule()).then((rule) => {
      cy.wrap(rule.body.id).as('ruleId');
      cy.wrap(rule.body.name).as('ruleName');
    });
  });

  it('displays and interacts with rule gaps', function () {
    // Intercept API calls with data
    interceptGetRuleGaps();
    interceptFillGap();

    // Visit rule details and go to execution log tab
    visit(ruleDetailsUrl(this.ruleId, 'execution_results'));
    waitForPageToBeLoaded(this.ruleName);
    cy.wait('@getRuleGaps');

    // Check gaps table is displayed with metrics
    cy.get(RULE_GAPS_INFO).should('exist');
    cy.get(RULE_GAPS_TABLE).should('exist');

    // Check table rows content
    getGapsTableRows().should('have.length', 4);

    // Check first row - unfilled gap
    getGapsTableRows()
      .eq(0)
      .within(() => {
        cy.contains('Unfilled');
        cy.contains('0%');
        cy.contains('In progress').should('not.exist');
        cy.contains('Fill gap');
      });

    // Check second row - partially filled gap
    getGapsTableRows()
      .eq(1)
      .within(() => {
        cy.contains('Partially filled');
        cy.contains('In progress');
        cy.contains('50%');
        cy.contains('Fill gap').should('not.exist');
      });

    // Check third row - filled gap
    getGapsTableRows()
      .eq(2)
      .within(() => {
        cy.contains('Filled');
        cy.contains('100%');
        cy.contains('In progress').should('not.exist');
        cy.contains('Fill gap').should('not.exist');
      });

    // Check fourth row - partially filled gap with unfilled intervals
    getGapsTableRows()
      .eq(3)
      .within(() => {
        cy.contains('Partially filled');
        cy.contains('50%');
        cy.contains('In progress').should('not.exist');
        cy.contains('Fill remaining gap');
      });

    // Test status filtering
    filterGapsByStatus('Unfilled');
    refreshGapsTable();
    cy.wait('@getRuleGaps');

    // Test filling gaps with enabled rule
    cy.get(RULE_GAPS_FILL_BUTTON).first().click();
    cy.wait('@fillGap');
    cy.get(TOASTER).contains('Manual run requested');

    // Test filling gaps with disabled rule
    cy.get(RULE_SWITCH).click();
    cy.get(RULE_GAPS_FILL_BUTTON).first().realHover();
    cy.get(TOOLTIP).contains('Rule should be enabled to fill gaps');

    // Test no data scenario
    interceptGetRuleGapsNoData();
    refreshGapsTable();
    cy.wait('@getRuleGaps');
    cy.get(RULE_GAPS_TABLE).contains('No items found');
  });
});
