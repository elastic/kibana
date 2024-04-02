/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import {
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import {
  clickAddElasticRulesButton,
  assertInstallationRequestIsComplete,
  interceptInstallationRequestToFail,
  interceptUpgradeRequestToFail,
  clickRuleUpdatesTab,
  assertUpgradeRequestIsComplete,
  assertRuleInstallationFailureToastShown,
  assertRulesPresentInAddPrebuiltRulesTable,
  assertRuleUpgradeFailureToastShown,
  assertRulesPresentInRuleUpdatesTable,
} from '../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Installation and Update - Error handling',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      preventPrebuiltRulesPackageInstallation();
      login();
      visitRulesManagementTable();
    });

    describe('Installation of prebuilt rules - Should fail gracefully with toast error message when', () => {
      const RULE_1 = createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      });
      const RULE_2 = createRuleAssetSavedObject({
        name: 'Test rule 2',
        rule_id: 'rule_2',
      });

      beforeEach(() => {
        // Make two mock rules available for installation
        installPrebuiltRuleAssets([RULE_1, RULE_2]);
      });

      it('installing prebuilt rules one by one', () => {
        // Navigate to install Elastic rules page
        clickAddElasticRulesButton();

        // Intercept and force the installation request to fail
        interceptInstallationRequestToFail([RULE_1]);

        // Attempt to install rule
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_1['security-rule'].rule_id)).click();
        // Wait for request to complete
        assertInstallationRequestIsComplete([RULE_1]);

        assertRuleInstallationFailureToastShown([RULE_1]);
        assertRulesPresentInAddPrebuiltRulesTable([RULE_1]);
      });

      it('installing multiple selected prebuilt rules by selecting them individually', () => {
        clickAddElasticRulesButton();

        interceptInstallationRequestToFail([RULE_1, RULE_2]);
        selectRulesByName([RULE_1['security-rule'].name, RULE_2['security-rule'].name]);
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationFailureToastShown([RULE_1, RULE_2]);
        assertRulesPresentInAddPrebuiltRulesTable([RULE_1, RULE_2]);
      });

      it('installing multiple selected prebuilt rules by selecting all in page', () => {
        clickAddElasticRulesButton();
        interceptInstallationRequestToFail([RULE_1, RULE_2]);
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationFailureToastShown([RULE_1, RULE_2]);
        assertRulesPresentInAddPrebuiltRulesTable([RULE_1, RULE_2]);
      });

      it('installing all available rules at once', () => {
        clickAddElasticRulesButton();
        interceptInstallationRequestToFail([RULE_1, RULE_2]);
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationFailureToastShown([RULE_1, RULE_2]);
        assertRulesPresentInAddPrebuiltRulesTable([RULE_1, RULE_2]);
      });
    });

    describe('Update of prebuilt rules - Should fail gracefully with toast error message when', () => {
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
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);
        cy.reload();
      });

      it('upgrading prebuilt rules one by one', () => {
        interceptUpgradeRequestToFail([OUTDATED_RULE_1]);

        // Navigate to Rule Upgrade table
        clickRuleUpdatesTab();

        // Attempt to upgrade rule
        cy.get(
          getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)
        ).click();
        // Wait for request to complete
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1]);

        assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1]);
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_1]);
      });

      it('upgrading multiple selected prebuilt rules by selecting them individually', () => {
        interceptUpgradeRequestToFail([OUTDATED_RULE_1, OUTDATED_RULE_2]);

        // Navigate to Rule Upgrade table
        clickRuleUpdatesTab();

        selectRulesByName([
          OUTDATED_RULE_1['security-rule'].name,
          OUTDATED_RULE_2['security-rule'].name,
        ]);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('upgrading multiple selected prebuilt rules by selecting all in page', () => {
        interceptUpgradeRequestToFail([OUTDATED_RULE_1, OUTDATED_RULE_2]);

        // Navigate to Rule Upgrade table
        clickRuleUpdatesTab();
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('upgrading all rules with available upgrades at once', () => {
        interceptUpgradeRequestToFail([OUTDATED_RULE_1, OUTDATED_RULE_2]);

        // Navigate to Rule Upgrade table
        clickRuleUpdatesTab();

        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });
    });
  }
);
