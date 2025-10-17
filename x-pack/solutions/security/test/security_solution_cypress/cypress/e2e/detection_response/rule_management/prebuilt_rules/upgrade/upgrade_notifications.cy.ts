/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  UPDATE_PREBUILT_RULE_PREVIEW,
} from '../../../../../screens/alerts_detection_rules';
import {
  PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT,
  SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT,
} from '../../../../../screens/prebuilt_rules_upgrade';
import { expectManagementTableRules } from '../../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import {
  installPrebuiltRuleAssets,
  installMockPrebuiltRulesPackage,
  installSpecificPrebuiltRulesRequest,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { visitRuleDetailsPage } from '../../../../../tasks/rule_details';
import { visitRuleEditPage } from '../../../../../tasks/edit_rule';
import { EDIT_RULE_SETTINGS_LINK } from '../../../../../screens/rule_details';

describe(
  'Detection rules, Prebuilt Rules Upgrade Notifications',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      // Prevent the real package installation
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
      /* Make sure persisted rules table state is cleared */
      resetRulesTableState();

      login();
    });

    describe('No notifications', () => {
      describe('Rules Management page', () => {
        it('does NOT display prebuilt rules upgrade reminder callout when no prebuilt rules are installed', () => {
          visitRulesManagementTable();

          cy.get(ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN).should('be.visible');

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('not.exist');
          cy.get(RULES_UPDATES_TAB).should('not.exist');
        });

        it('does NOT display prebuilt rules upgrade reminder callout when all installed prebuilt rules are up to date', () => {
          const PREBUILT_RULE = createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 1,
            index: ['test-*'],
          });
          installPrebuiltRuleAssets([PREBUILT_RULE]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE]);

          visitRulesManagementTable();

          expectManagementTableRules(['Non-customized prebuilt rule']);

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('not.exist');
          cy.get(RULES_UPDATES_TAB).should('not.exist');
        });

        it('does NOT display prebuilt rules upgrade reminder callout until the package installation is completed', () => {
          visitRulesManagementTable();

          cy.get(ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN).should('be.visible');

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('not.exist');
          cy.get(RULES_UPDATES_TAB).should('not.exist');

          // Simulate the package installation
          const PREBUILT_RULE_VERSION_1 = createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 1,
            index: ['test-*'],
          });
          const PREBUILT_RULE_VERSION_2 = createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 2,
            index: ['test-*'],
          });
          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]);

          cy.reload();

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates1`);
        });
      });

      describe('Rule Details page', () => {
        beforeEach(() => {
          const PREBUILT_RULE = createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 1,
            index: ['test-*'],
          });

          installPrebuiltRuleAssets([PREBUILT_RULE]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE]).then((response) =>
            visitRuleDetailsPage(response.body.results.created[0].id)
          );
        });

        it('does NOT display prebuilt rules upgrade reminder callout when the rule is up to date', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).should('not.exist');
        });
      });

      describe('Rule Editing page', () => {
        beforeEach(() => {
          const PREBUILT_RULE = createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 1,
            index: ['test-*'],
          });

          installPrebuiltRuleAssets([PREBUILT_RULE]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE]).then((response) =>
            visitRuleEditPage(response.body.results.created[0].id)
          );
        });

        it('does NOT display prebuilt rules upgrade reminder callout when the rule is up to date', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).should('not.exist');
        });
      });
    });

    describe('Notifications', () => {
      describe('Rules Management page', () => {
        const [PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2, PREBUILT_RULE_TO_INSTALL] = [
          createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 1,
            index: ['test-*'],
          }),
          createRuleAssetSavedObject({
            name: 'Non-customized prebuilt rule',
            rule_id: 'test-prebuilt-rule-1',
            version: 2,
            index: ['test-*'],
          }),
          createRuleAssetSavedObject({
            name: 'Prebuilt rule to install',
            rule_id: 'test-prebuilt-rule-2',
            version: 2,
            index: ['test-*'],
          }),
        ];

        it('shows the prebuilt rules upgrade reminder callout when there are some prebuilt rules to upgrade but there are no more prebuilt rules to install', () => {
          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]);

          visitRulesManagementTable();

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates1`);
        });

        it('shows the prebuilt rules upgrade reminder callout when there are some prebuilt rules to upgrade and some more prebuilt rules to install', () => {
          installPrebuiltRuleAssets([
            PREBUILT_RULE_VERSION_1,
            PREBUILT_RULE_VERSION_2,
            PREBUILT_RULE_TO_INSTALL,
          ]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]);

          visitRulesManagementTable();

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('be.visible');
          cy.get(RULES_UPDATES_TAB).should('have.text', `Rule Updates1`);
        });

        it('opens the Rule Upgrade table', () => {
          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]);

          visitRulesManagementTable();

          cy.get(RULES_UPDATES_TAB).click();
          cy.get(RULES_UPDATES_TABLE).should('be.visible');
        });

        it('dismisses prebuilt rules upgrade reminder callout', () => {
          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]);

          visitRulesManagementTable();

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).within(() => {
            cy.get('button').contains('Dismiss').click();
          });

          cy.get(PREBUILT_RULES_UPGRADE_REMINDER_CALLOUT).should('not.exist');
        });
      });

      describe('Rule Details page', () => {
        beforeEach(() => {
          const [PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2] = [
            createRuleAssetSavedObject({
              name: 'Non-customized prebuilt rule',
              rule_id: 'test-prebuilt-rule-1',
              version: 1,
              index: ['test-*'],
            }),
            createRuleAssetSavedObject({
              name: 'Non-customized prebuilt rule',
              rule_id: 'test-prebuilt-rule-1',
              version: 2,
              index: ['test-*'],
            }),
          ];

          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]).then((response) =>
            visitRuleDetailsPage(response.body.results.created[0].id)
          );
        });

        it('shows the prebuilt rule upgrade reminder callout when the rule is outdated and can be upgraded to a new version', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).should('be.visible');
        });

        it('opens the Rule Upgrade flyout', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).within(() => {
            cy.get('button').contains('Review update').click();
          });

          cy.get(UPDATE_PREBUILT_RULE_PREVIEW).should('be.visible');
        });

        it('does NOT show a "Dismiss" button in the prebuilt rule upgrade reminder callout', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).within(() => {
            cy.get('button').contains('Dismiss').should('not.exist');
          });
        });
      });

      describe('Rule Editing page', () => {
        beforeEach(() => {
          const [PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2] = [
            createRuleAssetSavedObject({
              name: 'Non-customized prebuilt rule',
              rule_id: 'test-prebuilt-rule-1',
              version: 1,
              index: ['test-*'],
            }),
            createRuleAssetSavedObject({
              name: 'Non-customized prebuilt rule',
              rule_id: 'test-prebuilt-rule-1',
              version: 2,
              index: ['test-*'],
            }),
          ];

          installPrebuiltRuleAssets([PREBUILT_RULE_VERSION_1, PREBUILT_RULE_VERSION_2]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE_VERSION_1]).then((response) =>
            visitRuleEditPage(response.body.results.created[0].id)
          );
        });

        it('shows the prebuilt rule upgrade reminder callout when the rule is outdated and can be upgraded to a new version', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).should('be.visible');
        });

        it('navigates to the Rule Details page via the prebuilt rule upgrade reminder callout', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).within(() => {
            cy.get('button').contains('Return to details').click();
          });

          cy.get(EDIT_RULE_SETTINGS_LINK).should('be.visible');
        });

        it('does NOT show a "Dismiss" button in the prebuilt rule upgrade reminder callout', () => {
          cy.get(SINGLE_PREBUILT_RULE_UPGRADE_REMINDER_CALLOUT).within(() => {
            cy.get('button').contains('Dismiss').should('not.exist');
          });
        });
      });
    });
  }
);
