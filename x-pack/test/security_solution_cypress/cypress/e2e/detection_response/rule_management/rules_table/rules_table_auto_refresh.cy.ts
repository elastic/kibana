/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../../tags';

import {
  RULE_CHECKBOX,
  REFRESH_RULES_STATUS,
  RULES_TABLE_AUTOREFRESH_INDICATOR,
  RULES_MANAGEMENT_TABLE,
} from '../../../../screens/alerts_detection_rules';
import {
  selectAllRules,
  clearAllRuleSelection,
  selectNumberOfRules,
  mockGlobalClock,
  disableAutoRefresh,
  expectAutoRefreshIsDisabled,
  expectAutoRefreshIsEnabled,
  expectAutoRefreshIsDeactivated,
  expectNumberOfRules,
} from '../../../../tasks/alerts_detection_rules';
import { login, visit, visitWithoutDateRange } from '../../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../../tasks/common';
import { getNewRule } from '../../../../objects/rule';

const DEFAULT_RULE_REFRESH_INTERVAL_VALUE = 60000;
const NUM_OF_TEST_RULES = 6;

describe('Rules table: auto-refresh', { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    login();

    for (let i = 1; i <= NUM_OF_TEST_RULES; ++i) {
      createRule(getNewRule({ name: `Test rule ${i}`, rule_id: `${i}` }));
    }
  });

  beforeEach(() => {
    login();
  });

  it('Auto refreshes rules', () => {
    mockGlobalClock();
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);

    // // mock 1 minute passing to make sure refresh is conducted
    cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
    cy.tick(DEFAULT_RULE_REFRESH_INTERVAL_VALUE);
    cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('be.visible');

    cy.contains(REFRESH_RULES_STATUS, 'Updated now');
  });

  it('should prevent table from rules refetch if any rule selected', () => {
    mockGlobalClock();
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);

    selectNumberOfRules(1);

    // mock 1 minute passing to make sure refresh is not conducted
    cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
    cy.tick(DEFAULT_RULE_REFRESH_INTERVAL_VALUE);
    cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');

    // ensure rule is still selected
    cy.get(RULE_CHECKBOX).first().should('be.checked');

    cy.get(REFRESH_RULES_STATUS).should('have.not.text', 'Updated now');
  });

  it('should disable auto refresh when any rule selected and enable it after rules unselected', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);

    // check refresh settings if it's enabled before selecting
    expectAutoRefreshIsEnabled();

    selectAllRules();

    // auto refresh should be deactivated (which means disabled without an ability to enable it) after rules selected
    expectAutoRefreshIsDeactivated();

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should be reset to its previous state
    expectAutoRefreshIsEnabled();
  });

  it('should not enable auto refresh after rules were unselected if auto refresh was disabled', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);

    disableAutoRefresh();

    selectAllRules();

    expectAutoRefreshIsDeactivated();

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should still be disabled
    expectAutoRefreshIsDisabled();
  });
});
