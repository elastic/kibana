/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  MODIFIED_RULE_BADGE,
  NO_RULES_AVAILABLE_FOR_UPGRADE_MESSAGE,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
  getUpgradeSingleRuleButtonByRuleId,
} from '../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  installPrebuiltRuleAssets,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { patchRule } from '../../../../tasks/api_calls/rules';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import {
  assertRuleUpgradeConflictsModalShown,
  assertRuleUpgradeSuccessToastShown,
  assertRulesNotPresentInRuleUpdatesTable,
  assertRulesPresentInRuleUpdatesTable,
  assertUpgradeRequestIsComplete,
  clickRuleUpdatesTab,
  clickUpgradeRuleWithoutConflicts,
  filterPrebuiltRulesUpdateTableByRuleCustomization,
} from '../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow - With Rule Customization',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'prebuiltRulesCustomizationEnabled',
          ])}`,
        ],
      },
    },
  },

  () => {
    describe('Upgrade of prebuilt rules without conflicts from Rule Updates Table', () => {
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

    describe('Upgrade of prebuilt rules with conflicts from Rule Updates Table', () => {
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
      const patchedName = 'A new name that creates a conflict';
      beforeEach(() => {
        login();
        resetRulesTableState();
        deleteAlertsAndRules();
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
          'updatePrebuiltRules'
        );
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2]);

        /* Modify both rule names to cause a conflict */
        for (const rule of [OUTDATED_RULE_1, OUTDATED_RULE_2]) {
          const { name, rule_id: ruleId } = rule['security-rule'];
          patchRule(ruleId, {
            name: `${name}-${patchedName}`,
          });
        }
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);

        visitRulesManagementTable();
        clickRuleUpdatesTab();
      });

      it('should disable individual upgrade button for all prebuilt rules with conflicts', () => {
        // All buttons should be disabled because of conflicts
        for (const rule of [OUTDATED_RULE_1, OUTDATED_RULE_2]) {
          const { rule_id: ruleId } = rule['security-rule'];
          expect(cy.get(getUpgradeSingleRuleButtonByRuleId(ruleId)).should('be.disabled'));
        }
      });

      const getPatchedName = (rule: { 'security-rule': { name: string } }) =>
        `${rule['security-rule'].name}-${patchedName}`;

      it('should disable `Update selected rules` button when all selected rules have conflicts', () => {
        selectRulesByName([OUTDATED_RULE_1, OUTDATED_RULE_2].map(getPatchedName));
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).should('be.disabled');
      });

      it('should disable `Update all rules` button when all  rules have conflicts', () => {
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).should('be.disabled');
      });
    });

    describe('Upgrade of prebuilt rules with and without conflicts from the Rule Updates table', () => {
      const RULE_1_ID = 'rule_1';
      const RULE_2_ID = 'rule_2';
      const RULE_3_ID = 'rule_3';
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
      const OUTDATED_RULE_3 = createRuleAssetSavedObject({
        name: 'Outdated rule 3',
        rule_id: RULE_3_ID,
        version: 1,
      });
      const UPDATED_RULE_3 = createRuleAssetSavedObject({
        name: 'Updated rule 3',
        rule_id: RULE_3_ID,
        version: 2,
      });
      const patchedName = 'Conflicting rule name';

      beforeEach(() => {
        login();
        resetRulesTableState();
        deleteAlertsAndRules();
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
          'updatePrebuiltRules'
        );

        // Create and install outdated rules
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2, OUTDATED_RULE_3]);

        // Modify one rule to create a conflict
        patchRule(OUTDATED_RULE_1['security-rule'].rule_id, { name: patchedName });

        // Install updated rule assets
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2, UPDATED_RULE_3]);

        visitRulesManagementTable();
        clickRuleUpdatesTab();
      });

      it('should filter by customized prebuilt rules', () => {
        // Filter table to show modified rules only
        filterPrebuiltRulesUpdateTableByRuleCustomization('Modified');
        cy.get(MODIFIED_RULE_BADGE).should('exist');

        // Verify only rules with customized rule sources are displayed
        cy.get(RULES_UPDATES_TABLE).contains(patchedName);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_2]);
      });

      it('should filter by non-customized prebuilt rules', () => {
        // Filter table to show unmodified rules only
        filterPrebuiltRulesUpdateTableByRuleCustomization('Unmodified');
        cy.get(MODIFIED_RULE_BADGE).should('not.exist');

        // Verify only rules with non-customized rule sources are displayed
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_2]);
        cy.get(patchedName).should('not.exist');
      });

      it('should allow upgrading rules without conflicts one by one', () => {
        cy.get(
          getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_2['security-rule'].rule_id)
        ).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_2]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_2]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_2]);

        // Verify conflicting rule and another un-upgraded rule remain
        cy.get(RULES_UPDATES_TABLE).contains(patchedName);
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_3]);
      });

      it('should disable the upgrade button for conflicting rules while allowing upgrades of no-conflict rules', () => {
        // Verify the conflicting rule's upgrade button is disabled
        expect(
          cy
            .get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id))
            .should('be.disabled')
        );

        // Verify non-conflicting rules' upgrade buttons are enabled
        expect(
          cy
            .get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_2['security-rule'].rule_id))
            .should('not.be.disabled')
        );
        expect(
          cy
            .get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_3['security-rule'].rule_id))
            .should('not.be.disabled')
        );
      });

      it('should warn about rules with conflicts not being upgrading when upgrading a set of selected rules', () => {
        selectRulesByName([
          patchedName, // Rule with conflict
          OUTDATED_RULE_2['security-rule'].name, // Rule without conflict
          OUTDATED_RULE_3['security-rule'].name, // Rule without conflict
        ]);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertRuleUpgradeConflictsModalShown();
        clickUpgradeRuleWithoutConflicts();

        // Assert only rules without conflicts are upgraded
        assertUpgradeRequestIsComplete([OUTDATED_RULE_2, OUTDATED_RULE_3]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_2, OUTDATED_RULE_3]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_2, OUTDATED_RULE_3]);

        // Verify conflicting rule remains in the table
        cy.get(RULES_UPDATES_TABLE).contains(patchedName);
      });

      it('should warn about rules with conflicts not being upgrading when upgrading all rules', () => {
        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        assertRuleUpgradeConflictsModalShown();
        clickUpgradeRuleWithoutConflicts();

        // Assert only rules without conflicts are upgraded
        assertUpgradeRequestIsComplete([OUTDATED_RULE_2, OUTDATED_RULE_3]);
        assertRuleUpgradeSuccessToastShown([OUTDATED_RULE_2, OUTDATED_RULE_3]);
        assertRulesNotPresentInRuleUpdatesTable([OUTDATED_RULE_2, OUTDATED_RULE_3]);

        // Verify conflicting rule remains in the table
        cy.get(RULES_UPDATES_TABLE).contains(patchedName);
      });
    });
  }
);
