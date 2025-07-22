/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkExportRules } from '../../../../tasks/rules_bulk_actions';
import { exportRuleFromDetailsPage, visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { getCustomQueryRuleParams, getIndexPatterns } from '../../../../objects/rule';
import {
  expectManagementTableRules,
  importRules,
  selectAllRules,
  selectRulesByName,
} from '../../../../tasks/alerts_detection_rules';
import { TOASTER, SUCCESS_TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  installMockPrebuiltRulesPackage,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { createRule, patchRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

const PREBUILT_RULE_ID = 'test-prebuilt-rule-a';

describe(
  'Detection rules, Prebuilt Rules Export workflow - With Rule Customization',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      deletePrebuiltRulesAssets();
      deleteAlertsAndRules();

      login();
      cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
    });

    describe('single rule', () => {
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: PREBUILT_RULE_ID,
        version: 1,
        index: getIndexPatterns(),
      });

      describe('rule details page', () => {
        beforeEach(() => {
          createAndInstallMockedPrebuiltRules([PREBUILT_RULE]).then(
            (installPrebuiltRulesResponse) =>
              visitRuleDetailsPage(installPrebuiltRulesResponse.body.results.created[0].id)
          );
        });

        it('exports a non-customized prebuilt rule', () => {
          exportRuleFromDetailsPage();

          cy.wait('@bulk_action').then(({ response }) => {
            expect(response?.statusCode).to.equal(200);
            cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
          });
        });

        it('exports a customized prebuilt rule', function () {
          patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' });

          exportRuleFromDetailsPage();

          cy.wait('@bulk_action').then(({ response }) => {
            expect(response?.statusCode).to.equal(200);
            cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
          });
        });
      });
    });

    describe('multiple rules', () => {
      const PREBUILT_RULE_ID_A = 'prebuilt-rule-a';
      const PREBUILT_RULE_ID_B = 'prebuilt-rule-b';
      const PREBUILT_RULE_ID_C = 'prebuilt-rule-c';
      const PREBUILT_RULE_ID_D = 'prebuilt-rule-d';

      const PREBUILT_RULE_A = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule A',
        rule_id: PREBUILT_RULE_ID_A,
        version: 1,
        index: getIndexPatterns(),
      });
      const PREBUILT_RULE_B = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule B',
        rule_id: PREBUILT_RULE_ID_B,
        version: 3,
        index: getIndexPatterns(),
      });
      const PREBUILT_RULE_C = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule C',
        rule_id: PREBUILT_RULE_ID_C,
        version: 5,
        index: getIndexPatterns(),
      });
      const PREBUILT_RULE_D = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule D',
        rule_id: PREBUILT_RULE_ID_D,
        version: 7,
        index: getIndexPatterns(),
      });

      it('exports multiple non-customized prebuilt rules in bulk', () => {
        createAndInstallMockedPrebuiltRules([
          PREBUILT_RULE_A,
          PREBUILT_RULE_B,
          PREBUILT_RULE_C,
          PREBUILT_RULE_D,
        ]);

        // Customize prebuilt rules
        patchRule(PREBUILT_RULE_ID_B, { name: 'Customized prebuilt rule B' });
        patchRule(PREBUILT_RULE_ID_D, { name: 'Customized prebuilt rule D' });

        visitRulesManagementTable();

        selectRulesByName(['Non-customized prebuilt rule A', 'Non-customized prebuilt rule C']);
        bulkExportRules();

        cy.wait('@bulk_action').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 2 of 2 rules.');
        });
      });

      it('exports multiple customized prebuilt rules in bulk', () => {
        createAndInstallMockedPrebuiltRules([
          PREBUILT_RULE_A,
          PREBUILT_RULE_B,
          PREBUILT_RULE_C,
          PREBUILT_RULE_D,
        ]);

        // Customize prebuilt rules
        patchRule(PREBUILT_RULE_ID_B, { name: 'Customized prebuilt rule B' });
        patchRule(PREBUILT_RULE_ID_D, { name: 'Customized prebuilt rule D' });

        visitRulesManagementTable();

        selectRulesByName(['Customized prebuilt rule B', 'Customized prebuilt rule D']);
        bulkExportRules();

        cy.wait('@bulk_action').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 2 of 2 rules.');
        });
      });

      it('exports a mix of non-customized prebuilt, customized prebuilt and custom rules in bulk', () => {
        createAndInstallMockedPrebuiltRules([
          PREBUILT_RULE_A,
          PREBUILT_RULE_B,
          PREBUILT_RULE_C,
          PREBUILT_RULE_D,
        ]);

        // Customize prebuilt rules
        patchRule(PREBUILT_RULE_ID_B, { name: 'Customized prebuilt rule B' });
        patchRule(PREBUILT_RULE_ID_D, { name: 'Customized prebuilt rule D' });

        const CUSTOM_RULE = getCustomQueryRuleParams({
          name: 'Custom rule to export',
          rule_id: 'custom_rule_id',
          enabled: false,
        });

        createRule(CUSTOM_RULE).then(() => visitRulesManagementTable());

        selectAllRules();
        bulkExportRules();

        cy.wait('@bulk_action').then(({ response }) => {
          expect(response?.statusCode).to.equal(200);
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 5 of 5 rules.');
        });
      });

      it('imports a previously exported mix of custom and prebuilt rules in bulk', () => {
        createAndInstallMockedPrebuiltRules([
          PREBUILT_RULE_A,
          PREBUILT_RULE_B,
          PREBUILT_RULE_C,
          PREBUILT_RULE_D,
        ]);

        // Customize prebuilt rules
        patchRule(PREBUILT_RULE_ID_B, { name: 'Customized prebuilt rule B' });
        patchRule(PREBUILT_RULE_ID_D, { name: 'Customized prebuilt rule D' });

        const CUSTOM_RULE = getCustomQueryRuleParams({
          name: 'Custom rule to export',
          rule_id: 'custom_rule_id',
          enabled: false,
        });

        createRule(CUSTOM_RULE).then(() => visitRulesManagementTable());

        selectAllRules();
        bulkExportRules();

        cy.wait('@bulk_action').then(({ response }) => {
          cy.get(SUCCESS_TOASTER_BODY).should('have.text', 'Successfully exported 5 of 5 rules.');

          deleteAlertsAndRules();
          cy.reload();
          cy.contains('Install and enable Elastic prebuilt detection rules').should('be.visible');

          importRules({
            contents: Cypress.Buffer.from(response?.body),
            fileName: 'mix_of_prebuilt_and_custom_rules.ndjson',
            mimeType: 'application/x-ndjson',
          });

          expectManagementTableRules([
            'Non-customized prebuilt rule A',
            'Customized prebuilt rule B',
            'Non-customized prebuilt rule C',
            'Customized prebuilt rule D',
            'Custom rule to export',
          ]);

          cy.get(TOASTER).should('have.text', 'Successfully imported 5 rules');
        });
      });
    });
  }
);
