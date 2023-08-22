/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../tags';

import { createRuleAssetSavedObject } from '../../../helpers/rules';
import { waitForRulesTableToBeLoaded } from '../../../tasks/alerts_detection_rules';
import { createAndInstallMockedPrebuiltRules } from '../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState, deleteAlertsAndRules, reload } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import {
  addElasticRulesButtonClick,
  assertRuleAvailableForInstallAndInstallOne,
  assertRuleAvailableForInstallAndInstallSelected,
  assertRuleAvailableForInstallAndInstallAllInPage,
  assertRuleAvailableForInstallAndInstallAll,
  assertRuleUpgradeAvailableAndUpgradeOne,
  assertRuleUpgradeAvailableAndUpgradeSelected,
  assertRuleUpgradeAvailableAndUpgradeAllInPage,
  assertRuleUpgradeAvailableAndUpgradeAll,
  ruleUpdatesTabClick,
} from '../../../tasks/prebuilt_rules';

describe(
  'Detection rules, Prebuilt Rules Installation and Update - Error handling',
  { tags: tag.ESS },
  () => {
    beforeEach(() => {
      login();
      resetRulesTableState();
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');

      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
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
        createAndInstallMockedPrebuiltRules({ rules: [RULE_1, RULE_2], installToKibana: false });
        waitForRulesTableToBeLoaded();
      });

      it('installing prebuilt rules one by one', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallOne({ rules: [RULE_1], didRequestFail: true });
      });

      it('installing multiple selected prebuilt rules by selecting them individually', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallSelected({
          rules: [RULE_1, RULE_2],
          didRequestFail: true,
        });
      });

      it('installing multiple selected prebuilt rules by selecting all in page', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallAllInPage({
          rules: [RULE_1, RULE_2],
          didRequestFail: true,
        });
      });

      it('installing all available rules at once', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallAll({
          rules: [RULE_1, RULE_2],
          didRequestFail: true,
        });
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
        createAndInstallMockedPrebuiltRules({ rules: [OUTDATED_RULE_1, OUTDATED_RULE_2] });
        /* Create a second version of the rule, making it available for update */
        createAndInstallMockedPrebuiltRules({
          rules: [UPDATED_RULE_1, UPDATED_RULE_2],
          installToKibana: false,
        });
        waitForRulesTableToBeLoaded();
        reload();
      });

      it('upgrading prebuilt rules one by one', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeOne({ rules: [OUTDATED_RULE_1], didRequestFail: true });
      });

      it('upgrading multiple selected prebuilt rules by selecting them individually', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeSelected({
          rules: [OUTDATED_RULE_1, OUTDATED_RULE_2],
          didRequestFail: true,
        });
      });

      it('upgrading multiple selected prebuilt rules by selecting all in page', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeAllInPage({
          rules: [OUTDATED_RULE_1, OUTDATED_RULE_2],
          didRequestFail: true,
        });
      });

      it('upgrading all rules with available upgrades at once', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeAll({
          rules: [OUTDATED_RULE_1, OUTDATED_RULE_2],
          didRequestFail: true,
        });
      });
    });
  }
);
