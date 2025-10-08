/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { downgradeLicenseToBasic } from '../../../../../tasks/license';
import { setUpRuleUpgrades } from '../../../../../tasks/prebuilt_rules/setup_rule_upgrades';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  UPDATE_PREBUILT_RULE_PREVIEW,
  UPDATE_PREBUILT_RULE_BUTTON,
  FIELD_UPGRADE_WRAPPER,
  RULES_MANAGEMENT_TABLE,
  TAGS_PROPERTY_VALUE_ITEM,
} from '../../../../../screens/alerts_detection_rules';
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import {
  assertRulesNotPresentInRuleUpdatesTable,
  assertRuleUpgradeSuccessToastShown,
} from '../../../../../tasks/prebuilt_rules';
import { openPrebuiltRuleUpgradeFlyoutFor } from '../../../../../tasks/prebuilt_rules_preview';
import {
  visitRulesManagementTable,
  visitRulesUpgradeTable,
} from '../../../../../tasks/rules_management';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import { expectRulesInTable, goToRuleDetailsOf } from '../../../../../tasks/alerts_detection_rules';

describe(
  'Detection rules, Prebuilt Rules Upgrade With Preview (Basic License)',
  { tags: ['@ess'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      resetRulesTableState();
      deletePrebuiltRulesAssets();
      deleteAlertsAndRules();
      login();
      downgradeLicenseToBasic();
    });

    const PREBUILT_RULE_ID = 'test-prebuilt-rule';
    const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID,
      version: 1,
      name: 'Prebuilt rule',
      description: 'Non-customized prebuilt rule',
      tags: ['tag-a', 'tab-b'],
    });
    const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID,
      version: 2,
      name: 'New Prebuilt rule',
      description: 'New Non-customized prebuilt rule',
      tags: ['tag-c', 'tab-d'],
    });

    it('upgrades a non-customized prebuilt rule after readonly preview', () => {
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET],
        rulePatches: [],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
      });
      visitRulesUpgradeTable();
      openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

      cy.contains(
        UPDATE_PREBUILT_RULE_PREVIEW,
        NEW_PREBUILT_RULE_ASSET['security-rule'].name
      ).should('be.visible');

      // Assert that we don't display new prebuilt rule upgrade UI
      cy.get(FIELD_UPGRADE_WRAPPER('name')).should('not.exist');
      cy.get(FIELD_UPGRADE_WRAPPER('description')).should('not.exist');

      // Upgrade the prebuilt rule
      cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

      assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
      assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);
    });

    it('upgrades a customized prebuilt rule after warning about losing customizations', () => {
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET],
        rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
      });
      visitRulesUpgradeTable();
      openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

      cy.contains(
        UPDATE_PREBUILT_RULE_PREVIEW,
        NEW_PREBUILT_RULE_ASSET['security-rule'].name
      ).should('be.visible');

      // Assert that we don't display new prebuilt rule upgrade UI
      cy.contains(UPDATE_PREBUILT_RULE_PREVIEW, 'Updating the rule will erase your changes').should(
        'be.visible'
      );

      // Upgrade the prebuilt rule
      cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

      assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
      assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);
    });

    it('upgrades a prebuilt rule to the target version', () => {
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET],
        rulePatches: [{ rule_id: PREBUILT_RULE_ID, tags: ['custom-tag'] }],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
      });
      visitRulesUpgradeTable();
      openPrebuiltRuleUpgradeFlyoutFor(PREBUILT_RULE_ASSET['security-rule'].name);

      cy.contains(
        UPDATE_PREBUILT_RULE_PREVIEW,
        NEW_PREBUILT_RULE_ASSET['security-rule'].name
      ).should('be.visible');

      // Upgrade the prebuilt rule
      cy.get(UPDATE_PREBUILT_RULE_BUTTON).click();

      assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET]);
      assertRulesNotPresentInRuleUpdatesTable([NEW_PREBUILT_RULE_ASSET]);

      visitRulesManagementTable();
      expectRulesInTable(RULES_MANAGEMENT_TABLE, [NEW_PREBUILT_RULE_ASSET['security-rule'].name]);

      goToRuleDetailsOf(NEW_PREBUILT_RULE_ASSET['security-rule'].name);

      // Assert that tags got upgraded to the target value
      cy.get(TAGS_PROPERTY_VALUE_ITEM).then((items) => {
        const tags = items.map((_, item) => item.textContent).toArray();
        cy.wrap(tags).should('deep.equal', NEW_PREBUILT_RULE_ASSET['security-rule'].tags);
      });
    });
  }
);
