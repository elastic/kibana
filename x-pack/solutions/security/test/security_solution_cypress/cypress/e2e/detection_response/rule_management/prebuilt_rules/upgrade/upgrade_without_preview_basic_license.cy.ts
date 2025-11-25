/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  RULES_MANAGEMENT_TABLE,
  TAGS_PROPERTY_VALUE_ITEM,
  UPGRADE_ALL_RULES_BUTTON,
} from '../../../../../screens/alerts_detection_rules';
import { expectRulesInTable, goToRuleDetailsOf } from '../../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { setUpRuleUpgrades } from '../../../../../tasks/prebuilt_rules/setup_rule_upgrades';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import {
  assertRulesNotPresentInRuleUpdatesTable,
  assertRuleUpgradeSuccessToastShown,
} from '../../../../../tasks/prebuilt_rules';
import {
  visitRulesManagementTable,
  visitRulesUpgradeTable,
} from '../../../../../tasks/rules_management';
import { downgradeLicenseToBasic } from '../../../../../tasks/license';

describe(
  'Detection rules, Prebuilt Rules Upgrade Without Preview (Basic License)',
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

    const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
    const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
    const PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_A,
      version: 1,
      name: 'Prebuilt rule A',
      description: 'Non-customized prebuilt rule A',
      tags: ['tag-a', 'tab-b'],
    });
    const NEW_PREBUILT_RULE_ASSET_A = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_A,
      version: 2,
      name: 'New Prebuilt rule A',
      description: 'New Non-customized prebuilt rule A',
      tags: ['tag-c', 'tab-d'],
    });
    const PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_B,
      version: 1,
      name: 'Prebuilt rule B',
      description: 'Non-customized prebuilt rule B',
      tags: ['tag-a', 'tab-b'],
    });
    const NEW_PREBUILT_RULE_ASSET_B = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_B,
      version: 2,
      name: 'New Prebuilt rule B',
      description: 'New Non-customized prebuilt rule B',
      tags: ['tag-c', 'tab-d'],
    });

    it('upgrades customized prebuilt rules with conflicts to the target versions', () => {
      setUpRuleUpgrades({
        currentRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
        rulePatches: [
          { rule_id: PREBUILT_RULE_ID_A, tags: ['custom-tag-a'] },
          { rule_id: PREBUILT_RULE_ID_B, tags: ['custom-tag-b'] },
        ],
        newRuleAssets: [NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B],
      });
      visitRulesUpgradeTable();

      cy.get(UPGRADE_ALL_RULES_BUTTON).click();

      assertRuleUpgradeSuccessToastShown([NEW_PREBUILT_RULE_ASSET_A, NEW_PREBUILT_RULE_ASSET_B]);
      assertRulesNotPresentInRuleUpdatesTable([
        NEW_PREBUILT_RULE_ASSET_A,
        NEW_PREBUILT_RULE_ASSET_B,
      ]);

      visitRulesManagementTable();
      expectRulesInTable(RULES_MANAGEMENT_TABLE, [
        NEW_PREBUILT_RULE_ASSET_A['security-rule'].name,
        NEW_PREBUILT_RULE_ASSET_B['security-rule'].name,
      ]);

      goToRuleDetailsOf(NEW_PREBUILT_RULE_ASSET_A['security-rule'].name);

      // Assert that tags got upgraded to the target value
      cy.get(TAGS_PROPERTY_VALUE_ITEM).then((items) => {
        const tags = items.map((_, item) => item.textContent).toArray();
        cy.wrap(tags).should('deep.equal', NEW_PREBUILT_RULE_ASSET_A['security-rule'].tags);
      });

      visitRulesManagementTable();
      goToRuleDetailsOf(NEW_PREBUILT_RULE_ASSET_B['security-rule'].name);

      // Assert that tags got upgraded to the target value
      cy.get(TAGS_PROPERTY_VALUE_ITEM).then((items) => {
        const tags = items.map((_, item) => item.textContent).toArray();
        cy.wrap(tags).should('deep.equal', NEW_PREBUILT_RULE_ASSET_B['security-rule'].tags);
      });
    });
  }
);
