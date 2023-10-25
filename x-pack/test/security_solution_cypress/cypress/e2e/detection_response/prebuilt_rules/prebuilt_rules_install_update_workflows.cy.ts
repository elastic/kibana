/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkInstallPackageInfo } from '@kbn/fleet-plugin/common';
import type { Rule } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';

import { createRuleAssetSavedObject } from '../../../helpers/rules';
import {
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  GO_BACK_TO_RULES_TABLE_BUTTON,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  NO_RULES_AVAILABLE_FOR_INSTALL_MESSAGE,
  NO_RULES_AVAILABLE_FOR_UPGRADE_MESSAGE,
  RULES_UPDATES_TAB,
  RULE_CHECKBOX,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  TOASTER,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../../../screens/alerts_detection_rules';
import { selectRulesByName } from '../../../tasks/alerts_detection_rules';
import {
  getRuleAssets,
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
} from '../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState, deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import {
  addElasticRulesButtonClick,
  ruleUpdatesTabClick,
  assertInstallationSuccess,
  assertInstallationRequestIsComplete,
  assertUpgradeRequestIsComplete,
  assertUpgradeSuccess,
} from '../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../tasks/rules_management';

// Failing: See https://github.com/elastic/kibana/issues/168897
describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      login();
      resetRulesTableState();
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');

      visitRulesManagementTable();
    });

    describe.only('Installation of prebuilt rules package via Fleet', () => {
      beforeEach(() => {
        cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackageBulk');
        cy.intercept('POST', '/api/fleet/epm/packages/security_detection_engine/*').as(
          'installPackage'
        );
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
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
        interface Response {
          body: {
            hits: {
              hits: Array<{ _source: { ['security-rule']: Rule } }>;
            };
          };
        }
        const getRulesAndAssertNumberInstalled = () => {
          getRuleAssets().then((response) => {
            const ruleIds = (response as Response).body.hits.hits.map(
              (hit) => hit._source['security-rule'].rule_id
            );

            const numberOfRulesToInstall = new Set(ruleIds).size;
            addElasticRulesButtonClick();

            cy.get(INSTALL_ALL_RULES_BUTTON).should('be.enabled').click();
            cy.wait('@installPrebuiltRules', {
              timeout: 60000,
            }).then(() => {
              cy.get(TOASTER)
                .should('be.visible')
                .should(
                  'have.text',
                  // i18n uses en-US format for numbers, which uses a comma as a thousands separator
                  `${numberOfRulesToInstall.toLocaleString('en-US')} rules installed successfully.`
                );
            });
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
        installPrebuiltRuleAssets([RULE_1, RULE_2]);
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
        addElasticRulesButtonClick();
      });

      it('should install prebuilt rules one by one', () => {
        // Attempt to install rules
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_1['security-rule'].rule_id)).click();
        // Wait for request to complete
        assertInstallationRequestIsComplete([RULE_1]);
        // Assert installation succeeded
        assertInstallationSuccess([RULE_1]);
      });

      it('should install multiple selected prebuilt rules by selecting them individually', () => {
        selectRulesByName([RULE_1['security-rule'].name, RULE_2['security-rule'].name]);
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertInstallationSuccess([RULE_1, RULE_2]);
      });

      it('should install multiple selected prebuilt rules by selecting all in page', () => {
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertInstallationSuccess([RULE_1, RULE_2]);
      });

      it('should install all available rules at once', () => {
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        assertInstallationRequestIsComplete([RULE_1, RULE_2]);
        assertInstallationSuccess([RULE_1, RULE_2]);
      });

      it('should display an empty screen when all available prebuilt rules have been installed', () => {
        cy.get(INSTALL_ALL_RULES_BUTTON).click();
        cy.get(TOASTER).should('be.visible').should('have.text', `2 rules installed successfully.`);
        cy.get(RULE_CHECKBOX).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_INSTALL_MESSAGE).should('exist');
        cy.get(GO_BACK_TO_RULES_TABLE_BUTTON).should('exist');
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
        createAndInstallMockedPrebuiltRules([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        /* Create a second version of the rule, making it available for update */
        installPrebuiltRuleAssets([UPDATED_RULE_1, UPDATED_RULE_2]);

        visitRulesManagementTable();
        ruleUpdatesTabClick();
      });

      it('should upgrade prebuilt rules one by one', () => {
        // Attempt to upgrade rule
        cy.get(
          getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)
        ).click();
        // Wait for request to complete
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1]);

        assertUpgradeSuccess([OUTDATED_RULE_1]);
      });

      it('should upgrade multiple selected prebuilt rules by selecting them individually', () => {
        selectRulesByName([
          OUTDATED_RULE_1['security-rule'].name,
          OUTDATED_RULE_2['security-rule'].name,
        ]);
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertUpgradeSuccess([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should upgrade multiple selected prebuilt rules by selecting all in page', () => {
        cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
        cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertUpgradeSuccess([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should upgrade all rules with available upgrades at once', () => {
        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        assertUpgradeRequestIsComplete([OUTDATED_RULE_1, OUTDATED_RULE_2]);
        assertUpgradeSuccess([OUTDATED_RULE_1, OUTDATED_RULE_2]);
      });

      it('should display an empty screen when all rules with available updates have been upgraded', () => {
        cy.get(UPGRADE_ALL_RULES_BUTTON).click();
        cy.get(RULES_UPDATES_TAB).should('not.exist');
        cy.get(NO_RULES_AVAILABLE_FOR_UPGRADE_MESSAGE).should('exist');
      });
    });
  }
);
