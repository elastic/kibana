/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkExportRules } from '../../../../tasks/rules_bulk_actions';
import { exportRuleFromDetailsPage } from '../../../../tasks/rule_details';
import {
  expectedExportedRule,
  expectedExportedRules,
  getIndexPatterns,
  getNewRule,
} from '../../../../objects/rule';
import {
  exportRule,
  filterByCustomRules,
  filterByElasticRules,
  selectAllRules,
  selectRulesByName,
} from '../../../../tasks/alerts_detection_rules';
import { RULE_NAME, SUCCESS_TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createAndInstallMockedPrebuiltRules } from '../../../../tasks/api_calls/prebuilt_rules';
import { createRule, findRuleByRuleId, patchRule } from '../../../../tasks/api_calls/rules';

import { login } from '../../../../tasks/login';

import { visitRulesManagementTable } from '../../../../tasks/rules_management';

const PREBUILT_RULE_ID = 'rule_1';

describe(
  'Detection rules, Prebuilt Rules Export workflow - With Rule Customization',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    describe('Rule export workflow with single rules', () => {
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        index: getIndexPatterns(),
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE]);
        createRule(
          getNewRule({ name: 'Custom rule to export', rule_id: 'custom_rule_id', enabled: false })
        ).as('customRuleResponse');
        visitRulesManagementTable();
      });

      it('can export non-customized prebuilt rules from the rule management table individually', function () {
        findRuleByRuleId(PREBUILT_RULE_ID).as('prebuiltRuleResponse');
        exportRule('Non-customized prebuilt rule');
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export customized prebuilt rules from the rule management table individually', function () {
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }).as(
          'prebuiltRuleResponse'
        ); // We want to make this a customized prebuilt rule
        exportRule('Customized prebuilt rule');
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export custom rules from the rule management table individually', function () {
        exportRule('Custom rule to export');
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.customRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a non-customized prebuilt rule from the rule details page', function () {
        findRuleByRuleId(PREBUILT_RULE_ID).as('prebuiltRuleResponse');
        cy.get(RULE_NAME).contains('Non-customized prebuilt rule').click();
        exportRuleFromDetailsPage();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a customized prebuilt rule from the rule details page', function () {
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }).as(
          'prebuiltRuleResponse'
        ); // We want to make this a customized prebuilt rule
        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();
        exportRuleFromDetailsPage();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.prebuiltRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a custom rule from the rule details page', function () {
        cy.get(RULE_NAME).contains('Custom rule to export').click();
        exportRuleFromDetailsPage();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.customRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });
    });

    describe('Rule export workflow with multiple rules', () => {
      const PREBUILT_RULE_1 = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        index: getIndexPatterns(),
      });

      const PREBUILT_RULE_2 = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: 'rule_2',
        version: 1,
        index: getIndexPatterns(),
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE_1, PREBUILT_RULE_2]);

        findRuleByRuleId(PREBUILT_RULE_ID).as('nonCustomizedPrebuiltRuleResponse');
        // We want to make this a customized prebuilt rule
        patchRule('rule_2', { name: 'Customized prebuilt rule' }).as(
          'customizedPrebuiltRuleResponse'
        );
        createRule(getNewRule({ name: 'Custom rule to export', enabled: false })).as(
          'customRuleResponse'
        );
        visitRulesManagementTable();
      });

      it('can export a non-customized prebuilt rule from the rule management table using the bulk actions menu', function () {
        selectRulesByName(['Non-customized prebuilt rule']);
        bulkExportRules();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should(
            'eql',
            expectedExportedRule(this.nonCustomizedPrebuiltRuleResponse)
          );
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a customized prebuilt rule from the rule management table using the bulk actions menu', function () {
        selectRulesByName(['Customized prebuilt rule']);
        bulkExportRules();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should(
            'eql',
            expectedExportedRule(this.customizedPrebuiltRuleResponse)
          );
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export a custom rule from the rule management table using the bulk actions menu', function () {
        filterByCustomRules();
        selectAllRules();
        bulkExportRules();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should('eql', expectedExportedRule(this.customRuleResponse));
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
        });
      });

      it('can export all rule types from the rule management table using the bulk actions menu', function () {
        selectAllRules();
        bulkExportRules();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should(
            'eql',
            expectedExportedRules([
              this.nonCustomizedPrebuiltRuleResponse,
              this.customizedPrebuiltRuleResponse,
              this.customRuleResponse,
            ])
          );
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 3 of 3 rules.');
        });
      });

      it('can export customized and non-customized prebuilt rules from the rule management table using the bulk actions menu', function () {
        filterByElasticRules();
        selectAllRules();
        bulkExportRules();
        cy.wait('@bulk_action').then(({ response }) => {
          cy.wrap(response?.body).should(
            'eql',
            expectedExportedRules([
              this.nonCustomizedPrebuiltRuleResponse,
              this.customizedPrebuiltRuleResponse,
            ])
          );
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 2 of 2 rules.');
        });
      });
    });
  }
);
