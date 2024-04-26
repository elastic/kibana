/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  REFRESH_RULES_STATUS,
  RULES_TABLE_AUTOREFRESH_INDICATOR,
  RULES_MANAGEMENT_TABLE,
} from '../../../../screens/alerts_detection_rules';
import { EUI_CHECKBOX } from '../../../../screens/common/controls';
import {
  selectAllRules,
  clearAllRuleSelection,
  mockGlobalClock,
  disableAutoRefresh,
  expectAutoRefreshIsDisabled,
  expectAutoRefreshIsEnabled,
  expectAutoRefreshIsDeactivated,
  expectNumberOfRules,
  selectRulesByName,
  getRuleRow,
  setRulesTableAutoRefreshIntervalSetting,
} from '../../../../tasks/alerts_detection_rules';
import { login } from '../../../../tasks/login';

import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const RULES_TABLE_REFRESH_INTERVAL_MS = 60000;

describe('Rules table: auto-refresh', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    setRulesTableAutoRefreshIntervalSetting({
      enabled: true,
      refreshInterval: RULES_TABLE_REFRESH_INTERVAL_MS,
    });
    createRule(getNewRule({ name: 'Test rule 1', rule_id: '1', enabled: false }));
  });

  it('gets deactivated when any rule selected and activated after rules unselected', () => {
    visitRulesManagementTable();

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

    // check refresh settings if it's enabled before selecting
    expectAutoRefreshIsEnabled();

    selectAllRules();

    // auto refresh should be deactivated (which means disabled without an ability to enable it) after rules selected
    expectAutoRefreshIsDeactivated();

    clearAllRuleSelection();

    // after all rules unselected, auto refresh should be reset to its previous state
    expectAutoRefreshIsEnabled();
  });

  describe('when enabled', () => {
    beforeEach(() => {
      mockGlobalClock();
      visitRulesManagementTable();

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);
    });

    it('refreshes rules after refresh interval has passed', () => {
      cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS);
      cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('be.visible');

      cy.contains(REFRESH_RULES_STATUS, 'Updated now');
    });

    it('refreshes rules on window focus', () => {
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS / 2);

      cy.window().trigger('blur');
      cy.window().trigger('focus');

      cy.contains(REFRESH_RULES_STATUS, 'Updated now');
    });
  });

  describe('when disabled', () => {
    beforeEach(() => {
      mockGlobalClock();
      visitRulesManagementTable();
      expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);
    });

    it('does NOT refresh rules after refresh interval has passed', () => {
      disableAutoRefresh();
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS * 2); // Make sure enough time has passed to verify auto-refresh doesn't happen

      cy.contains(REFRESH_RULES_STATUS, 'Updated 2 minutes ago');
    });

    it('does NOT refresh rules on window focus', () => {
      disableAutoRefresh();
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS * 2); // Make sure enough time has passed to verify auto-refresh doesn't happen

      cy.window().trigger('blur');
      cy.window().trigger('focus');

      // We need to make sure window focus event doesn't cause refetching. Without some delay
      // the following expectations always pass even. It happens since 'focus' event gets handled
      // in an async way so the status text is updated with some delay.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);

      // By using a custom timeout make sure it doesn't wait too long due to global timeout configuration
      // so the expected text appears after a refresh and the test passes while it shouldn't.
      cy.contains(REFRESH_RULES_STATUS, 'Updated 2 minutes ago', { timeout: 10000 });
    });

    it('does NOT get enabled after rules were unselected', () => {
      disableAutoRefresh();
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS * 2); // Make sure enough time has passed to verify auto-refresh doesn't happen

      selectAllRules();

      expectAutoRefreshIsDeactivated();

      clearAllRuleSelection();

      // after all rules unselected, auto refresh should still be disabled
      expectAutoRefreshIsDisabled();
    });
  });

  describe('when one rule is selected', () => {
    it('does NOT refresh after refresh interval has passed', () => {
      mockGlobalClock();
      visitRulesManagementTable();

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

      selectRulesByName(['Test rule 1']);

      // mock 1 minute passing to make sure refresh is not conducted
      cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
      cy.tick(RULES_TABLE_REFRESH_INTERVAL_MS * 2); // Make sure enough time has passed
      cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');

      // ensure rule is still selected
      getRuleRow('Test rule 1').find(EUI_CHECKBOX).should('be.checked');

      cy.get(REFRESH_RULES_STATUS).should('have.not.text', 'Updated now');
    });
  });
});
