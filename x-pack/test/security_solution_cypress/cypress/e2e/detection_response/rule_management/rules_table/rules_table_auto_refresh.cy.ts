/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../../../../tasks/alerts_detection_rules';
import { login, visit, visitWithoutDateRange } from '../../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';
import { createRule } from '../../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../../tasks/common';
import { getNewRule } from '../../../../objects/rule';

const ONE_MINUTE_IN_MS = 60000; // Corresponds to the auto-refresh interval
const NUM_OF_TEST_RULES = 6;

describe(
  'Rules table: auto-refresh',
  { tags: ['@ess', '@serverless', '@brokenInServerless'] },
  () => {
    before(() => {
      cleanKibana();
      login();

      for (let i = 1; i <= NUM_OF_TEST_RULES; ++i) {
        createRule(getNewRule({ name: `Test rule ${i}`, rule_id: `${i}`, enabled: false }));
      }
    });

    beforeEach(() => {
      login();
    });

    it('gets disabled when any rule selected and enabled after rules unselected', () => {
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

    describe('when enabled', () => {
      beforeEach(() => {
        mockGlobalClock();
        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

        expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);
      });

      it('refreshes rules after refresh interval has passed', () => {
        cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
        cy.tick(ONE_MINUTE_IN_MS);
        cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('be.visible');

        cy.contains(REFRESH_RULES_STATUS, 'Updated now');
      });

      it('refreshes rules on window focus', () => {
        cy.tick(ONE_MINUTE_IN_MS / 2);

        cy.window().trigger('blur');
        cy.window().trigger('focus');

        cy.contains(REFRESH_RULES_STATUS, 'Updated now');
      });
    });

    describe('when disabled', () => {
      beforeEach(() => {
        mockGlobalClock();
        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
        // waitForPageToBeLoaded();
        expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);
        disableAutoRefresh();
        cy.tick(ONE_MINUTE_IN_MS * 2); // Make sure enough time has passed to verify auto-refresh doesn't happen
      });

      it('does NOT refresh rules after refresh interval has passed', () => {
        cy.contains(REFRESH_RULES_STATUS, 'Updated 2 minutes ago');
      });

      it('does NOT refresh rules on window focus', () => {
        cy.window().trigger('blur');
        cy.window().trigger('focus');

        // Without a delay here the following expectations pass even it shouldn't happen
        // 'focus' event gets handled in async way so the status gets updated with some delay
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000);

        cy.get(REFRESH_RULES_STATUS).should('not.contain', 'Updating...');
        cy.contains(REFRESH_RULES_STATUS, 'Updated 2 minutes ago');
      });

      it('does NOT get enabled after rules were unselected', () => {
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
        visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);

        expectNumberOfRules(RULES_MANAGEMENT_TABLE, NUM_OF_TEST_RULES);

        selectRulesByName(['Test rule 1']);

        // mock 1 minute passing to make sure refresh is not conducted
        cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');
        cy.tick(ONE_MINUTE_IN_MS * 2); // Make sure enough time has passed
        cy.get(RULES_TABLE_AUTOREFRESH_INDICATOR).should('not.exist');

        // ensure rule is still selected
        getRuleRow('Test rule 1').find(EUI_CHECKBOX).should('be.checked');

        cy.get(REFRESH_RULES_STATUS).should('have.not.text', 'Updated now');
      });
    });
  }
);
