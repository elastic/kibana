/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrebuiltRuleMockOfType } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import {
  RuleResponse,
  RuleSignatureId,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  MODIFIED_RULE_BADGE,
  RULES_UPDATES_TABLE,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
  getReviewSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
} from '../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  SAMPLE_PREBUILT_RULE,
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
  'Detection rules, Prebuilt Rules Installation and Update workflow - With Rule Customization, Rule Updates Table',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },

  () => {
    describe('Upgrade of prebuilt rules with conflicts', () => {
      const RULE_1_ID = 'rule_1';
      const RULE_2_ID = 'rule_2';
      const OUTDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'Old rule 1',
        rule_id: RULE_1_ID,
        version: 1,
      });
      const UPDATED_RULE_1 = createRuleAssetSavedObject({
        name: 'New rule 1',
        rule_id: RULE_1_ID,
        version: 2,
      });
      const OUTDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'Old rule 2',
        rule_id: RULE_2_ID,
        version: 1,
      });
      const UPDATED_RULE_2 = createRuleAssetSavedObject({
        name: 'New rule 2',
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

        setUpRuleUpgrades({
          currentRuleAssets: [OUTDATED_RULE_1, OUTDATED_RULE_2],
          rulePatches: [
            { rule_id: RULE_1_ID, name: `Old rule 1 - ${patchedName}` },
            { rule_id: RULE_2_ID, name: `Old rule 2 - ${patchedName}` },
          ],
          newRuleAssets: [UPDATED_RULE_1, UPDATED_RULE_2],
        });

        visitRulesManagementTable();
        clickRuleUpdatesTab();
      });

      it('should display individual review buttons for all prebuilt rules with conflicts', () => {
        // All buttons should be review buttons because of conflicts
        for (const rule of [OUTDATED_RULE_1, OUTDATED_RULE_2]) {
          const { rule_id: ruleId } = rule['security-rule'];
          expect(cy.get(getReviewSingleRuleButtonByRuleId(ruleId)).should('exist'));
        }
      });

      it('should disable `Update selected rules` button when all selected rules have conflicts', () => {
        selectRulesByName(['Old rule 1', 'Old rule 2']);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).should('be.disabled');
      });
    });

    describe('Upgrade of prebuilt rules with and without conflicts', () => {
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

        setUpRuleUpgrades({
          currentRuleAssets: [OUTDATED_RULE_1, OUTDATED_RULE_2, OUTDATED_RULE_3],
          rulePatches: [{ rule_id: RULE_1_ID, name: patchedName }],
          newRuleAssets: [UPDATED_RULE_1, UPDATED_RULE_2, UPDATED_RULE_3],
        });

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

      it('should switch to a review button for conflicting rules while allowing upgrades of no-conflict rules', () => {
        // Verify the conflicting rule's upgrade button has the review label
        expect(
          cy
            .get(getReviewSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id))
            .should('exist')
        );

        // Verify non-conflicting rules' upgrade buttons do not have the review label
        expect(
          cy
            .get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_2['security-rule'].rule_id))
            .should('exist')
        );
        expect(
          cy
            .get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_3['security-rule'].rule_id))
            .should('exist')
        );
      });

      it.only('should warn about rules with conflicts not being upgrading when upgrading a set of selected rules', () => {
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

    describe('Upgrade of prebuilt rules with rule type changes', () => {
      const RULE_1_ID = 'rule_1';
      const RULE_2_ID = 'rule_2';
      const OUTDATED_QUERY_RULE_1 = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('query'),
        name: 'Outdated query rule 1',
        rule_id: RULE_1_ID,
        version: 1,
      });
      const UPDATED_ESQL_RULE_1 = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('esql'),
        name: 'Updated rule 1',
        rule_id: RULE_1_ID,
        version: 2,
      });
      const OUTDATED_QUERY_RULE_2 = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('query'),
        name: 'Outdated query rule 2',
        rule_id: RULE_2_ID,
        version: 1,
      });
      const UPDATED_ESQL_RULE_2 = createRuleAssetSavedObject({
        ...getPrebuiltRuleMockOfType('esql'),
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

        setUpRuleUpgrades({
          currentRuleAssets: [OUTDATED_QUERY_RULE_1, OUTDATED_QUERY_RULE_2],
          rulePatches: [],
          newRuleAssets: [UPDATED_ESQL_RULE_1, UPDATED_ESQL_RULE_2],
        });

        visitRulesManagementTable();
        clickRuleUpdatesTab();
      });

      it('should disable individual upgrade button for all rules', () => {
        // All buttons should be displayed as review buttons because rule type changes are considered conflicts
        for (const rule of [OUTDATED_QUERY_RULE_1, OUTDATED_QUERY_RULE_2]) {
          const { rule_id: ruleId } = rule['security-rule'];
          expect(cy.get(getReviewSingleRuleButtonByRuleId(ruleId)).should('exist'));
        }
      });

      it('should disable `Update selected rules` button for all selected rules', () => {
        selectRulesByName([
          OUTDATED_QUERY_RULE_1['security-rule'].name,
          OUTDATED_QUERY_RULE_2['security-rule'].name,
        ]);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).should('be.disabled');
      });
    });
  }
);

interface SetUpRulesParams {
  currentRuleAssets: Array<typeof SAMPLE_PREBUILT_RULE>;
  newRuleAssets: Array<typeof SAMPLE_PREBUILT_RULE>;
  rulePatches: Array<{ rule_id: RuleSignatureId } & Partial<RuleResponse>>;
}

function setUpRuleUpgrades({
  currentRuleAssets,
  newRuleAssets,
  rulePatches,
}: SetUpRulesParams): void {
  /* Create a new rule and install it */
  createAndInstallMockedPrebuiltRules(currentRuleAssets);

  for (const rule of rulePatches) {
    const { rule_id: ruleId, ...update } = rule;
    patchRule(ruleId, update);
  }
  /* Create a second version of the rule, making it available for update */
  installPrebuiltRuleAssets(newRuleAssets);
}
