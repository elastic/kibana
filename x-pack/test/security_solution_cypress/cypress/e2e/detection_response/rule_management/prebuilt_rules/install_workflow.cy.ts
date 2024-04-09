/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetRulesTableState } from '../../../../tasks/common';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  getInstallSingleRuleButtonByRuleId,
  GO_BACK_TO_RULES_TABLE_BUTTON,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  NO_RULES_AVAILABLE_FOR_INSTALL_MESSAGE,
  RULE_CHECKBOX,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  TOASTER,
} from '../../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import { RULE_MANAGEMENT_PAGE_BREADCRUMB } from '../../../../screens/breadcrumbs';
import { installPrebuiltRuleAssets } from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import {
  assertInstallationRequestIsComplete,
  assertRuleInstallationSuccessToastShown,
  assertRulesPresentInInstalledRulesTable,
  clickAddElasticRulesButton,
} from '../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    describe('Installation of prebuilt rules', () => {
      const RULE_1 = createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      });
      const RULE_2 = createRuleAssetSavedObject({
        name: 'Test rule 2',
        rule_id: 'rule_2',
      });
      beforeEach(() => {
        login();
        resetRulesTableState();
        deleteAlertsAndRules();
        visitRulesManagementTable();
        installPrebuiltRuleAssets([RULE_1, RULE_2]);
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
        clickAddElasticRulesButton();
      });

      it('should install prebuilt rules one by one', () => {
        // Attempt to install rules
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_1['security-rule'].rule_id)).click();
        // Wait for request to complete
        assertInstallationRequestIsComplete([RULE_1]);
        // Assert installation succeeded
        assertRuleInstallationSuccessToastShown([RULE_1]);
        // Go back to rules table and assert that the rules are installed
        cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
        assertRulesPresentInInstalledRulesTable([RULE_1]);
      });

      it('should install multiple selected prebuilt rules by selecting them individually', () => {
        selectRulesByName([RULE_1['security-rule'].name, RULE_2['security-rule'].name]);
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationSuccessToastShown([RULE_1, RULE_2]);
        // Go back to rules table and assert that the rules are installed
        cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
        assertRulesPresentInInstalledRulesTable([RULE_1, RULE_2]);
      });

      it('should install multiple selected prebuilt rules by selecting all in page', () => {
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationSuccessToastShown([RULE_1, RULE_2]);
        // Go back to rules table and assert that the rules are installed
        cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
        assertRulesPresentInInstalledRulesTable([RULE_1, RULE_2]);
      });

      it('should install all available rules at once', () => {
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertRuleInstallationSuccessToastShown([RULE_1, RULE_2]);
        // Go back to rules table and assert that the rules are installed
        cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
        assertRulesPresentInInstalledRulesTable([RULE_1, RULE_2]);
      });

      it('should display an empty screen when all available prebuilt rules have been installed', () => {
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        cy.get(TOASTER).should('be.visible').should('have.text', `2 rules installed successfully.`);
        cy.get(RULE_CHECKBOX).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_INSTALL_MESSAGE).should('exist');
        cy.get(GO_BACK_TO_RULES_TABLE_BUTTON).should('exist');
      });
    });
  }
);
