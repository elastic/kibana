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
  getUpgradeSingleRuleButtonByRuleId,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../../tasks/alerts_detection_rules';
import { setUpRuleUpgrades } from '../../../../../tasks/prebuilt_rules/setup_rule_upgrades';
import { login } from '../../../../../tasks/login';
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import {
  interceptUpgradeRequestToFail,
  assertUpgradeRequestIsComplete,
  assertRuleUpgradeFailureToastShown,
  assertRuleUpgradeSuccessToastShown,
  interceptUpgradeRequestToFailPartially,
} from '../../../../../tasks/prebuilt_rules';
import { visitRulesUpgradeTable } from '../../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Upgrade - Error handling',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      deletePrebuiltRulesAssets();
      deleteAlertsAndRules();
      login();
    });

    const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
    const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
    const PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
      name: 'Outdated rule A',
      rule_id: PREBUILT_RULE_ID_A,
      version: 1,
    });
    const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
      name: 'Updated rule A',
      rule_id: PREBUILT_RULE_ID_A,
      version: 2,
    });
    const PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
      name: 'Outdated rule B',
      rule_id: PREBUILT_RULE_ID_B,
      version: 1,
    });
    const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
      name: 'Updated rule B',
      rule_id: PREBUILT_RULE_ID_B,
      version: 2,
    });

    it('shows an error toast when unable to upgrade a prebuilt rule', () => {
      interceptUpgradeRequestToFail([PREBUILT_RULE_ASSET_A]);
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A],
      });
      visitRulesUpgradeTable();

      // Attempt to upgrade rule
      cy.get(
        getUpgradeSingleRuleButtonByRuleId(PREBUILT_RULE_ASSET_A['security-rule'].rule_id)
      ).click();

      // Wait for request to complete
      assertUpgradeRequestIsComplete([PREBUILT_RULE_ASSET_A]);
      assertRuleUpgradeFailureToastShown([PREBUILT_RULE_ASSET_A]);
    });

    it('shows an error toast when unable to upgrade selected prebuilt rules', () => {
      interceptUpgradeRequestToFail([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
      });
      visitRulesUpgradeTable();

      selectRulesByName([
        PREBUILT_RULE_ASSET_A['security-rule'].name,
        PREBUILT_RULE_ASSET_B['security-rule'].name,
      ]);
      cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();

      assertUpgradeRequestIsComplete([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      assertRuleUpgradeFailureToastShown([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
    });

    it('shows an error toast when unable to upgrade all selected on the page prebuilt rules', () => {
      interceptUpgradeRequestToFail([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
      });
      visitRulesUpgradeTable();

      cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
      cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();

      assertUpgradeRequestIsComplete([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      assertRuleUpgradeFailureToastShown([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
    });

    it('shows an error toast when unable to upgrade all prebuilt rules', () => {
      interceptUpgradeRequestToFail([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
      });
      visitRulesUpgradeTable();

      cy.get(UPGRADE_ALL_RULES_BUTTON).click();

      assertUpgradeRequestIsComplete([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
      assertRuleUpgradeFailureToastShown([PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B]);
    });

    it('shows error and success toasts when prebuilt rules upgrade was partially successful', () => {
      interceptUpgradeRequestToFailPartially({
        rulesToSucceed: [PREBUILT_RULE_ASSET_A],
        rulesToFail: [PREBUILT_RULE_ASSET_B],
      });
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
      });
      visitRulesUpgradeTable();

      cy.get(UPGRADE_ALL_RULES_BUTTON).click();

      assertRuleUpgradeSuccessToastShown([PREBUILT_RULE_ASSET_A]);
      assertRuleUpgradeFailureToastShown([PREBUILT_RULE_ASSET_B]);
    });
  }
);
