/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_PATH,
  RULES_ADD_PATH,
  RULES_UPDATES,
} from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  createAndInstallMockedPrebuiltRules,
  installPrebuiltRuleAssets,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { visit } from '../../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';
import {
  ADD_ELASTIC_RULES_BTN,
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  GO_BACK_TO_RULES_TABLE_BUTTON,
  INSTALL_ALL_RULES_BUTTON,
  RULES_MANAGEMENT_TAB,
  RULES_MANAGEMENT_TABLE,
  RULES_UPDATES_TAB,
  RULE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
} from '../../../../screens/alerts_detection_rules';
import { login } from '../../../../tasks/login';

// Rule to test update
const RULE_1_ID = 'rule_1';
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

// Rule to test installation
const RULE_2_ID = 'rule_2';
const RULE_2 = createRuleAssetSavedObject({
  name: 'Rule 2',
  rule_id: RULE_2_ID,
  version: 1,
});

const loadPageAsReadOnlyUser = (url: string) => {
  login(ROLES.t1_analyst);
  visit(url);
};

const loginPageAsWriteAuthorizedUser = (url: string) => {
  login(ROLES.t3_analyst);
  visit(url);
};

// https://github.com/elastic/kibana/issues/179965
describe(
  'Detection rules, Prebuilt Rules Installation and Update - Authorization/RBAC',
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    beforeEach(() => {
      preventPrebuiltRulesPackageInstallation();
    });

    describe('User with read privileges on Security Solution', () => {
      it('should not be able to install prebuilt rules', () => {
        // Install one prebuilt rule asset to assert that user can't install it
        installPrebuiltRuleAssets([RULE_2]);

        // Now login with read-only user in preparation for test
        loadPageAsReadOnlyUser(RULES_MANAGEMENT_URL);

        // Check that Add Elastic Rules button is disabled
        cy.get(ADD_ELASTIC_RULES_BTN).should('be.disabled');

        // Navigate to Add Elastic Rules page anyways via URL
        // and assert that rules cannot be selected and all
        // installation buttons are disabled
        cy.visit(`${APP_PATH}${RULES_ADD_PATH}`);
        cy.get(INSTALL_ALL_RULES_BUTTON).should('be.disabled');
        cy.get(getInstallSingleRuleButtonByRuleId(UPDATED_RULE_1['security-rule'].rule_id)).should(
          'not.exist'
        );
        cy.get(RULE_CHECKBOX).should('not.exist');
      });

      it('should not be able to upgrade prebuilt rules', () => {
        // Install one prebuilt rule asset to assert that user can't upgrade it
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1]);
        // Create a new version of the rule to make it available for upgrade
        installPrebuiltRuleAssets([UPDATED_RULE_1]);

        // Now login with read-only user in preparation for test
        loadPageAsReadOnlyUser(RULES_MANAGEMENT_URL);

        // Check that Rule Update tab is not shown
        cy.get(RULES_UPDATES_TAB).should('not.exist');

        // Navigate to Rule Update tab anyways via URL
        // and assert that rules cannot be selected and all
        // upgrade buttons are disabled
        cy.visit(`${APP_PATH}${RULES_UPDATES}`);
        cy.get(UPGRADE_ALL_RULES_BUTTON).should('be.disabled');

        // Upgrade button and selection checkbox should not be visible
        cy.get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)).should(
          'not.exist'
        );
        cy.get(RULE_CHECKBOX).should('not.exist');
      });
    });

    describe('User with write privileges on Security Solution', () => {
      it('should be able to install prebuilt rules', () => {
        // Install one prebuilt rule asset to assert that user can install it
        installPrebuiltRuleAssets([RULE_2]);
        loginPageAsWriteAuthorizedUser(RULES_MANAGEMENT_URL);

        // Check that Add Elastic Rules button is enabled
        cy.get(ADD_ELASTIC_RULES_BTN).should('not.be.disabled');

        // Navigate to Add Elastic Rules page and assert that rules can be selected
        // and all installation buttons are enabled
        cy.get(ADD_ELASTIC_RULES_BTN).click();
        cy.get(INSTALL_ALL_RULES_BUTTON).should('not.be.disabled');
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_2['security-rule'].rule_id)).should('exist');
        cy.get(RULE_CHECKBOX).should('exist');

        // Install all available prebuilt rules
        cy.get(INSTALL_ALL_RULES_BUTTON).click();

        // Rule shouldn't be available for installation anymore
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_2['security-rule'].rule_id)).should(
          'not.exist'
        );

        // Navigate back to rules table and assert rule is installed
        cy.get(GO_BACK_TO_RULES_TABLE_BUTTON).click();
        cy.get(RULES_MANAGEMENT_TABLE).contains(RULE_2['security-rule'].name);
      });

      it('should be able to upgrade prebuilt rules', () => {
        // Install one prebuilt rule asset to assert that user can upgrade it
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1]);
        // Create a new version of the rule to make it available for upgrade
        installPrebuiltRuleAssets([UPDATED_RULE_1]);
        loginPageAsWriteAuthorizedUser(RULES_MANAGEMENT_URL);

        // Check that Rule Update tab is shown
        cy.get(RULES_UPDATES_TAB).should('exist');

        // Navigate to Rule Update tab and assert that rules can be selected
        // and all upgrade buttons are enabled
        cy.get(RULES_UPDATES_TAB).click();
        cy.get(UPGRADE_ALL_RULES_BUTTON).should('not.be.disabled');
        cy.get(RULE_CHECKBOX).should('exist');
        cy.get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)).should(
          'exist'
        );

        // Upgrade the rule and assert that it's upgraded
        cy.get(
          getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)
        ).click();
        cy.get(RULES_MANAGEMENT_TAB).click();
        cy.get(RULES_MANAGEMENT_TABLE).contains(UPDATED_RULE_1['security-rule'].name);
      });
    });
  }
);
