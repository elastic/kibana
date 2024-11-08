/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { patchRule } from '../../../../tasks/api_calls/rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  MODIFIED_RULE_BADGE,
  RULES_UPDATES_TABLE,
} from '../../../../screens/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import {
  assertRulesNotPresentInRuleUpdatesTable,
  assertRulesPresentInRuleUpdatesTable,
  clickRuleUpdatesTab,
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
    describe('Upgrade of prebuilt rules with conflicts', () => {
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
        /* Modify one of the rule's name to cause a conflict */
        patchRule(OUTDATED_RULE_1['security-rule'].rule_id, {
          name: patchedName,
        });
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);

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

      it('should filter by customized prebuilt rules', () => {
        // Filter table to show unmodified rules only
        filterPrebuiltRulesUpdateTableByRuleCustomization('Unmodified');
        cy.get(MODIFIED_RULE_BADGE).should('not.exist');

        // Verify only rules with non-customized rule sources are displayed
        assertRulesPresentInRuleUpdatesTable([OUTDATED_RULE_2]);
        cy.get(patchedName).should('not.exist');
      });
    });
  }
);
