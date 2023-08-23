/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkInstallPackageInfo } from '@kbn/fleet-plugin/common';
import type { Rule } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
import { tag } from '../../../tags';
import { createRuleAssetSavedObject } from '../../../helpers/rules';
import {
  GO_BACK_TO_RULES_TABLE_BUTTON,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  NO_RULES_AVAILABLE_FOR_INSTALL_MESSSAGE,
  NO_RULES_AVAILABLE_FOR_UPGRADE_MESSSAGE,
  RULES_UPDATES_TAB,
  RULE_CHECKBOX,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  TOASTER,
} from '../../../screens/alerts_detection_rules';
import { waitForRulesTableToBeLoaded } from '../../../tasks/alerts_detection_rules';
import {
  getRuleAssets,
  createAndInstallMockedPrebuiltRules,
} from '../../../tasks/api_calls/prebuilt_rules';
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
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    beforeEach(() => {
      login();
      resetRulesTableState();
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');

      visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
    });

    describe('Installation of prebuilt rules package via Fleet', () => {
      beforeEach(() => {
        cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackageBulk');
        cy.intercept('POST', '/api/fleet/epm/packages/security_detection_engine/*').as(
          'installPackage'
        );
        waitForRulesTableToBeLoaded();
      });

      it('should install package from Fleet in the background', () => {
        /* Assert that the package in installed from Fleet */
        cy.wait('@installPackageBulk', {
          timeout: 60000,
        }).then(({ response: bulkResponse }) => {
          cy.wrap(bulkResponse?.statusCode).should('eql', 200);

          const packages = bulkResponse?.body.items.map(
            ({ name, result }: BulkInstallPackageInfo) => ({
              name,
            })
          );

          const packagesBulkInstalled = packages.map(({ name }: { name: string }) => name);

          // Under normal flow the package is installed via the Fleet bulk install API.
          // However, for testing purposes the package can be installed via the Fleet individual install API,
          // so we need to intercept and wait for that request as well.
          if (!packagesBulkInstalled.includes('security_detection_engine')) {
            // Should happen only during testing when the `xpack.securitySolution.prebuiltRulesPackageVersion` flag is set
            cy.wait('@installPackage').then(({ response }) => {
              cy.wrap(response?.statusCode).should('eql', 200);
              cy.wrap(response?.body)
                .should('have.property', 'items')
                .should('have.length.greaterThan', 0);
            });
          } else {
            // Normal flow, install via the Fleet bulk install API
            expect(packages.length).to.have.greaterThan(0);
            // At least one of the packages installed should be the security_detection_engine package
            expect(packages).to.satisfy((pckgs: BulkInstallPackageInfo[]) =>
              pckgs.some((pkg) => pkg.name === 'security_detection_engine')
            );
          }
        });
      });

      it('should install rules from the Fleet package when user clicks on CTA', () => {
        const getRulesAndAssertNumberInstalled = () => {
          getRuleAssets().then((response) => {
            const ruleIds = response.body.hits.hits.map(
              (hit: { _source: { ['security-rule']: Rule } }) =>
                hit._source['security-rule'].rule_id
            );

            const numberOfRulesToInstall = new Set(ruleIds).size;
            addElasticRulesButtonClick();

            cy.get(INSTALL_ALL_RULES_BUTTON).should('be.enabled').click();
            cy.get(TOASTER)
              .should('be.visible')
              .should('have.text', `${numberOfRulesToInstall} rules installed successfully.`);
          });
        };
        /* Retrieve how many rules were installed from the Fleet package */
        /* See comments in test above for more details */
        cy.wait('@installPackageBulk', {
          timeout: 60000,
        }).then(({ response: bulkResponse }) => {
          cy.wrap(bulkResponse?.statusCode).should('eql', 200);

          const packagesBulkInstalled = bulkResponse?.body.items.map(
            ({ name }: { name: string }) => name
          );

          if (!packagesBulkInstalled.includes('security_detection_engine')) {
            cy.wait('@installPackage').then(() => {
              getRulesAndAssertNumberInstalled();
            });
          } else {
            getRulesAndAssertNumberInstalled();
          }
        });
      });
    });

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
        createAndInstallMockedPrebuiltRules({ rules: [RULE_1, RULE_2], installToKibana: false });
        waitForRulesTableToBeLoaded();
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
      });

      it('should install prebuilt rules one by one', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallOne({ rules: [RULE_1] });
      });

      it('should install multiple selected prebuilt rules by selecting them individually', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallSelected({ rules: [RULE_1, RULE_2] });
      });

      it('should install multiple selected prebuilt rules by selecting all in page', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallAllInPage({ rules: [RULE_1, RULE_2] });
      });

      it('should install all available rules at once', () => {
        addElasticRulesButtonClick();
        assertRuleAvailableForInstallAndInstallAll({ rules: [RULE_1, RULE_2] });
      });

      it('should display an empty screen when all available prebuilt rules have been installed', () => {
        addElasticRulesButtonClick();
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        cy.get(TOASTER).should('be.visible').should('have.text', `2 rules installed successfully.`);
        cy.get(RULE_CHECKBOX).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_INSTALL_MESSSAGE).should('exist');
        cy.get(GO_BACK_TO_RULES_TABLE_BUTTON).should('exist');
      });

      it('should fail gracefully with toast error message when request to install rules fails', () => {
        /* Stub request to force rules installation to fail */
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform', {
          statusCode: 500,
        }).as('installPrebuiltRules');
        addElasticRulesButtonClick();
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        cy.wait('@installPrebuiltRules');
        cy.get(TOASTER).should('be.visible').should('have.text', 'Rule installation failed');
      });
    });

    describe('Upgrade of prebuilt rules', () => {
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
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform').as(
          'updatePrebuiltRules'
        );
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

      it('should upgrade prebuilt rules one by one', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeOne({ rules: [OUTDATED_RULE_1] });
      });

      it('should upgrade multiple selected prebuilt rules by selecting them individually', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeSelected({ rules: [OUTDATED_RULE_1, OUTDATED_RULE_2] });
      });

      it('should upgrade multiple selected prebuilt rules by selecting all in page', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeAllInPage({
          rules: [OUTDATED_RULE_1, OUTDATED_RULE_2],
        });
      });

      it('should upgrade all rules with available upgrades at once', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeAll({ rules: [OUTDATED_RULE_1, OUTDATED_RULE_2] });
        cy.get(RULES_UPDATES_TAB).should('not.exist');
      });

      it('should display an empty screen when all rules with available updates have been upgraded', () => {
        ruleUpdatesTabClick();
        assertRuleUpgradeAvailableAndUpgradeAll({ rules: [OUTDATED_RULE_1, OUTDATED_RULE_2] });
        cy.get(RULES_UPDATES_TAB).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_UPGRADE_MESSSAGE).should('exist');
      });
    });
  }
);
