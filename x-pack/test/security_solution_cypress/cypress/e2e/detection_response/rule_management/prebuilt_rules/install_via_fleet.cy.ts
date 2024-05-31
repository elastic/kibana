/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkInstallPackageInfo } from '@kbn/fleet-plugin/common';
import type { Rule } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';

import { resetRulesTableState } from '../../../../tasks/common';
import { INSTALL_ALL_RULES_BUTTON, TOASTER } from '../../../../screens/alerts_detection_rules';
import { getRuleAssets } from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import { clickAddElasticRulesButton } from '../../../../tasks/prebuilt_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

// Failing: See https://github.com/elastic/kibana/issues/182439
// Failing: See https://github.com/elastic/kibana/issues/182440
describe.skip(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless'] },
  () => {
    describe('Installation of prebuilt rules package via Fleet', () => {
      beforeEach(() => {
        login();
        resetRulesTableState();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/fleet/epm/packages/_bulk*').as('installPackageBulk');
        cy.intercept('POST', '/api/fleet/epm/packages/security_detection_engine/*').as(
          'installPackage'
        );
        cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform').as(
          'installPrebuiltRules'
        );
        visitRulesManagementTable();
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
            clickAddElasticRulesButton();

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
  }
);
