/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  ADD_ELASTIC_RULES_BTN,
  ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN,
  RULES_UPDATES_TAB,
} from '../../../../screens/alerts_detection_rules';
import { deleteFirstRule } from '../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import {
  installAllPrebuiltRulesRequest,
  installPrebuiltRuleAssets,
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../tasks/common';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

const RULE_1 = createRuleAssetSavedObject({
  name: 'Test rule 1',
  rule_id: 'rule_1',
});

describe(
  'Detection rules, Prebuilt Rules Installation and Update Notifications',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    beforeEach(() => {
      preventPrebuiltRulesPackageInstallation();

      login();
      /* Make sure persisted rules table state is cleared */
      resetRulesTableState();
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
    });

    describe('No notifications', () => {
      it('should NOT display install or update notifications when no prebuilt assets and no rules are installed', () => {
        visitRulesManagementTable();

        cy.get(ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN).should('be.visible');

        // TODO: test plan asserts "should NOT see a CTA to install prebuilt rules"
        // but current behavior is to always show the CTA, even with no prebuilt rule assets installed
        // Update that behaviour and then update this test.
        cy.get(RULES_UPDATES_TAB).should('not.exist');
      });

      // https://github.com/elastic/kibana/issues/179967
      it(
        'should NOT display install or update notifications when latest rules are installed',
        { tags: ['@skipInServerlessMKI'] },
        () => {
          visitRulesManagementTable();
          createAndInstallMockedPrebuiltRules([RULE_1]);

          /* Assert that there are no installation or update notifications */
          /* Add Elastic Rules button should not contain a number badge */
          /* and Rule Upgrade tab should not be displayed */
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', 'Add Elastic rules');
          cy.get(RULES_UPDATES_TAB).should('not.exist');
        }
      );
    });

    // https://github.com/elastic/kibana/issues/179968
    describe('Notifications', () => {
      beforeEach(() => {
        installPrebuiltRuleAssets([RULE_1]);
      });

      describe('Rules installation notification when no rules have been installed', () => {
        beforeEach(() => {
          visitRulesManagementTable();
        });

        it('should notify user about prebuilt rules available for installation', () => {
          cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules${1}`);
          cy.get(RULES_UPDATES_TAB).should('not.exist');
        });
      });

      describe('Rule installation notification when at least one rule already installed', () => {
        beforeEach(() => {
          installAllPrebuiltRulesRequest().then(() => {
            /* Create new rule assets with a different rule_id as the one that was */
            /* installed before in order to trigger the installation notification */
            const RULE_2 = createRuleAssetSavedObject({
              name: 'Test rule 2',
              rule_id: 'rule_2',
            });
            const RULE_3 = createRuleAssetSavedObject({
              name: 'Test rule 3',
              rule_id: 'rule_3',
            });

            visitRulesManagementTable();
            installPrebuiltRuleAssets([RULE_2, RULE_3]);
          });
        });

        it('should notify user about prebuilt rules available for installation', () => {
          const numberOfAvailableRules = 2;
          cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
          cy.get(ADD_ELASTIC_RULES_BTN).should(
            'have.text',
            `Add Elastic rules${numberOfAvailableRules}`
          );
          cy.get(RULES_UPDATES_TAB).should('not.exist');
        });

        it('should notify user a rule is again available for installation if it is deleted', () => {
          /* Install available rules, assert that the notification is gone */
          /* then delete one rule and assert that the notification is back */
          installAllPrebuiltRulesRequest().then(() => {
            cy.reload();
            deleteFirstRule();
            cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
            cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules${1}`);
          });
        });
      });

      describe('Rule update notification', () => {
        beforeEach(() => {
          installAllPrebuiltRulesRequest().then(() => {
            /* Create new rule asset with the same rule_id as the one that was installed  */
            /* but with a higher version, in order to trigger the update notification     */
            const UPDATED_RULE = createRuleAssetSavedObject({
              name: 'Test rule 1.1 (updated)',
              rule_id: 'rule_1',
              version: 2,
            });
            installPrebuiltRuleAssets([UPDATED_RULE]);
            visitRulesManagementTable();
          });
        });

        it('should notify user about prebuilt rules package available for update', () => {
          // No rules available for installation
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules`);
          // But 1 rule available for update
          cy.get(RULES_UPDATES_TAB).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates${1}`);
        });
      });

      describe('Rule installation available and rule update available notifications', () => {
        beforeEach(() => {
          installAllPrebuiltRulesRequest().then(() => {
            /* Create new rule assets with a different rule_id as the one that was */
            /* installed before in order to trigger the installation notification */
            const RULE_2 = createRuleAssetSavedObject({
              name: 'Test rule 2',
              rule_id: 'rule_2',
            });
            /* Create new rule asset with the same rule_id as the one that was installed  */
            /* but with a higher version, in order to trigger the update notification     */
            const UPDATED_RULE = createRuleAssetSavedObject({
              name: 'Test rule 1.1 (updated)',
              rule_id: 'rule_1',
              version: 2,
            });
            installPrebuiltRuleAssets([RULE_2, UPDATED_RULE]);
            visitRulesManagementTable();
          });
        });

        it('should notify user about prebuilt rules available for installation and for upgrade', () => {
          // 1 rule available for installation
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules${1}`);
          // 1 rule available for update
          cy.get(RULES_UPDATES_TAB).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates${1}`);
        });
      });
    });
  }
);
