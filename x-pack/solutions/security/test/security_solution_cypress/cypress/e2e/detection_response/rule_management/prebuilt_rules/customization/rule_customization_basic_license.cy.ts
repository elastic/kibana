/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule, readRule } from '../../../../../tasks/api_calls/rules';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import { filterByElasticRules, selectAllRules } from '../../../../../tasks/alerts_detection_rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  installMockPrebuiltRulesPackage,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../../tasks/login';
import { getIndexPatterns, getCustomQueryRuleParams } from '../../../../../objects/rule';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { downgradeLicenseToBasic } from '../../../../../tasks/license';
import { visitRuleEditPage } from '../../../../../tasks/edit_rule';
import {
  ABOUT_EDIT_TAB,
  DEFINITION_EDIT_TAB,
  SCHEDULE_EDIT_TAB,
} from '../../../../../screens/create_new_rule';
import {
  clickBulkAddIndexPatternsMenuItem,
  clickBulkAddInvestigationFieldsMenuItem,
  clickBulkAddTagsMenuItem,
  clickBulkDeleteIndexPatternsMenuItem,
  clickBulkDeleteInvestigationFieldsMenuItem,
  clickBulkDeleteTagsMenuItem,
  clickBulkEditRuleScheduleMenuItem,
} from '../../../../../tasks/rules_bulk_actions';
import {
  RULES_BULK_ACTION_CONFIRMATION_MODAL,
  RULES_BULK_ACTION_REJECT_MODAL,
} from '../../../../../screens/rules_bulk_actions';

describe(
  'Detection rules, Prebuilt Rules Customization workflow (Basic License)',
  { tags: ['@ess'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    const testTags = ['tag 1', 'tag 2'];
    const PREBUILT_RULE_ID = 'test-customization-prebuilt-rule';
    const PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      name: 'Non-customized prebuilt rule',
      rule_id: PREBUILT_RULE_ID,
      version: 1,
      index: getIndexPatterns(),
      tags: testTags,
      investigation_fields: { field_names: ['source.ip'] },
    });

    beforeEach(() => {
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
      /* Create a new rule and install it */
      createAndInstallMockedPrebuiltRules([PREBUILT_RULE_ASSET]);
      createRule(
        getCustomQueryRuleParams({
          rule_id: 'custom-rule',
          name: 'Custom rule',
          enabled: false,
        })
      );

      // Read and save just installed prebuilt rule's rule_id
      readRule({ ruleId: PREBUILT_RULE_ID })
        .then(({ body: prebuiltRule }) => prebuiltRule.id)
        .as('prebuiltRuleId');

      login();
      downgradeLicenseToBasic();
    });

    describe('under an insufficient license', () => {
      it('fails to customize prebuilt rules under an insufficient license from the rule edit page', () => {
        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleEditPage(prebuiltRuleId)
        );

        cy.get(SCHEDULE_EDIT_TAB).should('be.disabled');
        cy.get(SCHEDULE_EDIT_TAB).realHover();
        cy.contains('Without the Enterprise subscription');

        cy.get(DEFINITION_EDIT_TAB).should('be.disabled');
        cy.get(DEFINITION_EDIT_TAB).realHover();
        cy.contains('Without the Enterprise subscription');

        cy.get(ABOUT_EDIT_TAB).should('be.disabled');
        cy.get(ABOUT_EDIT_TAB).realHover();
        cy.contains('Without the Enterprise subscription');
      });

      describe('bulk editing', () => {
        beforeEach(() => {
          visitRulesManagementTable();
        });

        it('fails to add index patterns', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkAddIndexPatternsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to delete index patterns', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkDeleteIndexPatternsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to add tags', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkAddTagsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to delete tags', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkDeleteTagsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to add custom highlighted fields', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkAddInvestigationFieldsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to delete custom highlighted fields', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkDeleteInvestigationFieldsMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to modify the rule schedule', () => {
          filterByElasticRules();
          selectAllRules();

          clickBulkEditRuleScheduleMenuItem();

          cy.contains(RULES_BULK_ACTION_REJECT_MODAL, 'rule cannot be edited').should('be.visible');
          cy.get(RULES_BULK_ACTION_REJECT_MODAL).contains('Enterprise subscription is required');
        });

        it('fails to bulk edit bulk prebuilt rules in a mixture of prebuilt and custom rules', () => {
          selectAllRules();

          clickBulkAddTagsMenuItem();

          cy.contains(
            RULES_BULK_ACTION_CONFIRMATION_MODAL,
            'This action can only be applied to 1 rule'
          ).should('be.visible');
          cy.get(RULES_BULK_ACTION_CONFIRMATION_MODAL).contains(
            'Enterprise subscription is required'
          );
        });
      });
    });
  }
);
