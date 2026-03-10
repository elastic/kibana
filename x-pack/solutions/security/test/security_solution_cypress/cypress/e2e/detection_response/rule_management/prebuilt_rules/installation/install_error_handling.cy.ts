/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  RULES_UPDATES_TABLE,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../../../../../screens/alerts_detection_rules';
import { expectRulesInTable, selectRulesByName } from '../../../../../tasks/alerts_detection_rules';
import {
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
  installMockPrebuiltRulesPackage,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../../tasks/login';
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
  interceptInstallationRequestToFailPartially,
  assertRuleInstallationSuccessToastShown,
  assertRuleUpgradeSuccessToastShown,
  interceptUpgradeRequestToFailPartially,
} from '../../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Installation - Error handling',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      deletePrebuiltRulesAssets();
      deleteAlertsAndRules();
      preventPrebuiltRulesPackageInstallation();
      login();
      visitRulesManagementTable();
    });

    const PREBUILT_RULE_A = createRuleAssetSavedObject({
      name: 'Test rule 1',
      rule_id: 'rule_1',
    });
    const PREBUILT_RULE_B = createRuleAssetSavedObject({
      name: 'Test rule 2',
      rule_id: 'rule_2',
    });

    beforeEach(() => {
      // Make two mock rules available for installation
      installPrebuiltRuleAssets([PREBUILT_RULE_A, PREBUILT_RULE_B]);
    });

    it('shows an error toast when unable to install a prebuilt rule', () => {
      // Navigate to install Elastic rules page
      clickAddElasticRulesButton();

      // Intercept and force the installation request to fail
      interceptInstallationRequestToFail([PREBUILT_RULE_A]);

      // Attempt to install rule
      cy.get(getInstallSingleRuleButtonByRuleId(PREBUILT_RULE_A['security-rule'].rule_id)).click();
      // Wait for request to complete
      assertInstallationRequestIsComplete([PREBUILT_RULE_A]);

      assertRuleInstallationFailureToastShown([PREBUILT_RULE_A]);
      assertRulesPresentInAddPrebuiltRulesTable([PREBUILT_RULE_A]);
    });

    it('shows an error toast when unable to install selected prebuilt rules', () => {
      clickAddElasticRulesButton();

      interceptInstallationRequestToFail([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      selectRulesByName([
        PREBUILT_RULE_A['security-rule'].name,
        PREBUILT_RULE_B['security-rule'].name,
      ]);
      cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
      assertInstallationRequestIsComplete([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRuleInstallationFailureToastShown([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRulesPresentInAddPrebuiltRulesTable([PREBUILT_RULE_A, PREBUILT_RULE_B]);
    });

    it('shows an error toast when unable to install all selected on the page prebuilt rules', () => {
      clickAddElasticRulesButton();
      interceptInstallationRequestToFail([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
      cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
      assertInstallationRequestIsComplete([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRuleInstallationFailureToastShown([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRulesPresentInAddPrebuiltRulesTable([PREBUILT_RULE_A, PREBUILT_RULE_B]);
    });

    it('shows an error toast when unable to install all prebuilt rules', () => {
      clickAddElasticRulesButton();
      interceptInstallationRequestToFail([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      cy.get(INSTALL_ALL_RULES_BUTTON).click();
      assertInstallationRequestIsComplete([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRuleInstallationFailureToastShown([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRulesPresentInAddPrebuiltRulesTable([PREBUILT_RULE_A, PREBUILT_RULE_B]);
    });

    it('shows an error and success toasts when prebuilt rules installation was partially successful', () => {
      clickAddElasticRulesButton();
      interceptInstallationRequestToFailPartially({
        rulesToSucceed: [PREBUILT_RULE_A],
        rulesToFail: [PREBUILT_RULE_B],
      });
      cy.get(INSTALL_ALL_RULES_BUTTON).click();
      assertInstallationRequestIsComplete([PREBUILT_RULE_A, PREBUILT_RULE_B]);
      assertRuleInstallationSuccessToastShown([PREBUILT_RULE_A]);
      assertRuleInstallationFailureToastShown([PREBUILT_RULE_B]);
      assertRulesPresentInAddPrebuiltRulesTable([PREBUILT_RULE_A, PREBUILT_RULE_B]);
    });
  }
);

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
    cy.get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)).click();
    // Wait for request to complete
    assertUpgradeRequestIsComplete([OUTDATED_RULE_1]);

    assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1]);
    expectRulesInTable(RULES_UPDATES_TABLE, ['Outdated rule 1']);
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
    expectRulesInTable(RULES_UPDATES_TABLE, ['Outdated rule 1', 'Outdated rule 2']);
  });

  it('upgrading multiple selected prebuilt rules by selecting all in page', () => {
    interceptUpgradeRequestToFail([OUTDATED_RULE_1, OUTDATED_RULE_2]);

    // Navigate to Rule Upgrade table
    clickRuleUpdatesTab();
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
    cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
    assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
    assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
    expectRulesInTable(RULES_UPDATES_TABLE, ['Outdated rule 1', 'Outdated rule 2']);
  });

  it('upgrading all rules with available upgrades at once', () => {
    interceptUpgradeRequestToFail([OUTDATED_RULE_1, OUTDATED_RULE_2]);

    // Navigate to Rule Upgrade table
    clickRuleUpdatesTab();

    cy.get(UPGRADE_ALL_RULES_BUTTON).click();
    assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
    assertRuleUpgradeFailureToastShown([OUTDATED_RULE_1, OUTDATED_RULE_2]);
    expectRulesInTable(RULES_UPDATES_TABLE, ['Outdated rule 1', 'Outdated rule 2']);
  });

  it('upgrading all rules with available upgrades at once with some rules succeeding', () => {
    interceptUpgradeRequestToFailPartially({
      rulesToSucceed: [OUTDATED_RULE_1],
      rulesToFail: [OUTDATED_RULE_2],
    });

    // Navigate to Rule Upgrade table
    clickRuleUpdatesTab();

    cy.get(UPGRADE_ALL_RULES_BUTTON).click();
    assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_1]);
    assertRuleUpgradeFailureToastShown([OUTDATED_RULE_2]);
    expectRulesInTable(RULES_UPDATES_TABLE, ['Outdated rule 1', 'Outdated rule 2']);
  });
});
