/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exportRuleFromDetailsPage } from '../../../../tasks/rule_details';
import { expectedExportedRule, getIndexPatterns, getNewRule } from '../../../../objects/rule';
import { exportRule } from '../../../../tasks/alerts_detection_rules';
import { RULE_NAME, TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createAndInstallMockedPrebuiltRules } from '../../../../tasks/api_calls/prebuilt_rules';
import { createRule, findRuleByRuleId, patchRule } from '../../../../tasks/api_calls/rules';

import { login } from '../../../../tasks/login';

import { visitRulesManagementTable } from '../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Export workflow - With Rule Customization',
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
    describe('Rule export workflow', () => {
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'rule 1',
        rule_id: 'rule_1',
        version: 1,
        index: getIndexPatterns(),
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE]);
        visitRulesManagementTable();
        createRule(getNewRule({ name: 'Rule to export', enabled: false })).as('customRuleResponse');
      });

      it('can export a non-customized prebuilt rule from the rule management table', function () {
        findRuleByRuleId('rule_1').as('prebuiltRuleResponse');
        exportRule('rule 1');
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a customized prebuilt rule from the rule management table', function () {
        patchRule('rule_1', { name: 'modified rule name' }).as('prebuiltRuleResponse'); // We want to make this a customized prebuilt rule
        exportRule('modified rule name');
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a non-customized prebuilt rule from the rule details page', function () {
        findRuleByRuleId('rule_1').as('prebuiltRuleResponse');
        cy.get(RULE_NAME).contains('rule 1').click();
        exportRuleFromDetailsPage();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a customized prebuilt rule from the rule details page', function () {
        patchRule('rule_1', { name: 'modified rule name' }).as('prebuiltRuleResponse'); // We want to make this a customized prebuilt rule
        cy.get(RULE_NAME).contains('modified rule name').click();
        exportRuleFromDetailsPage();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });
    });
  }
);
