/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  getUpgradeSingleRuleButtonByRuleId,
  NO_RULES_AVAILABLE_FOR_UPGRADE_MESSAGE,
  RULES_UPDATES_TAB,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import {
  assertRulesNotPresentInRuleUpdatesTable,
  assertRuleUpgradeSuccessToastShown,
  assertUpgradeRequestIsComplete,
  clickRuleUpdatesTab,
} from '../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    describe('Upgrade of prebuilt rules', () => {
      const RULE_1_ID = 'rule_1';
      const RULE_2_ID = 'rule_2';
      const OUTDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'Outdated rule 1',
        rule_id: RULE_1_ID,
        version: 1,
      });
      const UPDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'Updated rule 1',
        rule_id: RULE_1_ID,
        version: 2,
      });
      const OUTDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'Outdated rule 2',
        rule_id: RULE_2_ID,
        version: 1,
      });
      const UPDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'Updated rule 2',
        rule_id: RULE_2_ID,
        version: 2,
      });
      beforeEach(() => {
        login();
        resetRulesTableState();
        deleteAlertsAndRules();
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
          'updatePrebuiltRules'
        );
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);

        visitRulesManagementTable();
        clickRuleUpdatesTab();
      });

      it('should upgrade prebuilt rules one by one', () => {
        // Attempt to upgrade rule
        cy.get(
          getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)
        ).click();
        // Wait for request to complete
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1]);

        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_1]);
      });

      it('should upgrade multiple selected prebuilt rules by selecting them individually', () => {
        selectRulesByName([
          OUTDATED_RULE_1['security-rule'].name,
          OUTDATED_RULE_2['security-rule'].name,
        ]);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should upgrade multiple selected prebuilt rules by selecting all in page', () => {
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should upgrade all rules with available upgrades at once', () => {
        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should display an empty screen when all rules with available updates have been upgraded', () => {
        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        cy.get(RULES_UPDATES_TAB).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_UPGRADE_MESSAGE).should('exist');
      });
    });
  }
);
