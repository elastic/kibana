/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  ADD_ELASTIC_RULES_BTN,
  ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN,
} from '../../../../../screens/alerts_detection_rules';
import { deleteFirstRule } from '../../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import {
  installAllPrebuiltRulesRequest,
  installPrebuiltRuleAssets,
  installMockPrebuiltRulesPackage,
  installSpecificPrebuiltRulesRequest,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Install Notifications',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
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
      it('does NOT display install notifications when no rules are installed', () => {
        visitRulesManagementTable();

        cy.get(ADD_ELASTIC_RULES_EMPTY_PROMPT_BTN).should('be.visible');
        cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', 'Add Elastic rules');
      });

      it(
        'does NOT display install notifications when latest rules are installed',
        { tags: ['@skipInServerlessMKI'] },
        () => {
          const PREBUILT_RULE = createRuleAssetSavedObject({
            name: 'Test prebuilt rule 1',
            rule_id: 'rule_1',
            version: 1,
          });

          installPrebuiltRuleAssets([PREBUILT_RULE]);
          installSpecificPrebuiltRulesRequest([PREBUILT_RULE]);

          visitRulesManagementTable();

          cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', 'Add Elastic rules');
        }
      );
    });

    describe('Notifications', () => {
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'Test prebuilt rule 1',
        rule_id: 'rule_1',
        version: 1,
      });

      beforeEach(() => {
        installPrebuiltRuleAssets([PREBUILT_RULE]);
      });

      describe('Rules installation notification when no rules have been installed', () => {
        it('notifies user about prebuilt rules available for installation', () => {
          visitRulesManagementTable();

          cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules1`);
        });
      });

      describe('Rule installation notification when at least one rule already installed', () => {
        beforeEach(() => {
          const NEW_PREBUILT_RULE_1 = createRuleAssetSavedObject({
            name: 'New prebuilt rule 1',
            rule_id: 'test-new-prebuilt-rule-1',
            version: 1,
          });
          const NEW_PREBUILT_RULE_2 = createRuleAssetSavedObject({
            name: 'New prebuilt rule 2',
            rule_id: 'test-new-prebuilt-rule-2',
            version: 1,
          });

          installSpecificPrebuiltRulesRequest([PREBUILT_RULE]);
          installPrebuiltRuleAssets([NEW_PREBUILT_RULE_1, NEW_PREBUILT_RULE_2]);

          visitRulesManagementTable();
        });

        it('notifies user about prebuilt rules available for installation', () => {
          cy.get(ADD_ELASTIC_RULES_BTN).should('be.visible');
          cy.get(ADD_ELASTIC_RULES_BTN).should('have.text', `Add Elastic rules2`);
        });

        it('notifies user a rule is again available for installation after it is deleted', () => {
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
    });
  }
);
