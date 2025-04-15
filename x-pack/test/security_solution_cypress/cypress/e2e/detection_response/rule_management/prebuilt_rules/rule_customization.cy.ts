/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickRuleUpdatesTab } from '../../../../tasks/prebuilt_rules';
import {
  clickUpdateScheduleMenuItem,
  openBulkEditAddIndexPatternsForm,
  openBulkEditAddInvestigationFieldsForm,
  openBulkEditAddTagsForm,
  openBulkEditDeleteIndexPatternsForm,
  openBulkEditDeleteInvestigationFieldsForm,
  openBulkEditDeleteTagsForm,
  setScheduleIntervalTimeUnit,
  setScheduleLookbackTimeUnit,
  submitBulkEditForm,
  typeIndexPatterns,
  typeInvestigationFields,
  typeScheduleInterval,
  typeScheduleLookback,
  typeTags,
  waitForBulkEditActionToFinish,
} from '../../../../tasks/rules_bulk_actions';
import {
  ABOUT_EDIT_TAB,
  ACTIONS_EDIT_TAB,
  DEFINITION_EDIT_TAB,
  SCHEDULE_EDIT_TAB,
} from '../../../../screens/create_new_rule';
import { ABOUT_RULE_DESCRIPTION } from '../../../../screens/rule_details';
import { goToRuleEditSettings } from '../../../../tasks/rule_details';
import { getIndexPatterns, getNewRule } from '../../../../objects/rule';
import {
  editFirstRule,
  expectModifiedBadgeToBeDisplayed,
  expectModifiedBadgeToNotBeDisplayed,
  expectToContainModifiedBadge,
  expectToNotContainModifiedBadge,
  filterByCustomRules,
  filterByElasticRules,
  selectAllRules,
} from '../../../../tasks/alerts_detection_rules';
import { MODIFIED_RULE_BADGE, RULE_NAME } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  installPrebuiltRuleAssets,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { createRule, patchRule } from '../../../../tasks/api_calls/rules';

import { login } from '../../../../tasks/login';

import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { fillDescription, goToAboutStepTab } from '../../../../tasks/create_new_rule';
import { saveEditedRule } from '../../../../tasks/edit_rule';
describe(
  'Detection rules, Prebuilt Rules Customization workflow',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },

  () => {
    describe('Customizing prebuilt rules', () => {
      const testTags = ['tag 1', 'tag 2'];
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: 'rule_1',
        version: 1,
        index: getIndexPatterns(),
        tags: testTags,
        investigation_fields: { field_names: ['source.ip'] },
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        deletePrebuiltRulesAssets();
        preventPrebuiltRulesPackageInstallation();
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE]);
        visitRulesManagementTable();
        createRule(
          getNewRule({
            name: 'Custom rule',
            index: getIndexPatterns(),
            tags: testTags,
            enabled: false,
          })
        );
      });

      it('user can navigate to rule editing page from the rule details page', function () {
        cy.get(RULE_NAME).contains('Non-customized prebuilt rule').click();

        goToRuleEditSettings();
        cy.get(DEFINITION_EDIT_TAB).should('be.enabled');
        cy.get(ABOUT_EDIT_TAB).should('be.enabled');
        cy.get(SCHEDULE_EDIT_TAB).should('be.enabled');
        cy.get(ACTIONS_EDIT_TAB).should('be.enabled');
      });

      it('user can edit a non-customized prebuilt rule from the rule edit page', function () {
        const newDescriptionValue = 'New rule description';
        cy.get(RULE_NAME).contains('Non-customized prebuilt rule').click();

        goToRuleEditSettings();
        goToAboutStepTab();
        fillDescription(newDescriptionValue);
        saveEditedRule();

        expectModifiedBadgeToBeDisplayed();
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newDescriptionValue);
      });

      it('user can edit a customized prebuilt rule from the rule edit page', function () {
        const newDescriptionValue = 'New rule description';
        patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
        visitRulesManagementTable();

        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();
        expectModifiedBadgeToBeDisplayed(); // Expect modified badge to already be displayed

        goToRuleEditSettings();
        goToAboutStepTab();
        fillDescription(newDescriptionValue);
        saveEditedRule();

        expectModifiedBadgeToBeDisplayed();
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newDescriptionValue);
      });

      it('user can navigate to rule editing page from the rule management page', function () {
        filterByElasticRules();
        editFirstRule();

        cy.get(DEFINITION_EDIT_TAB).should('be.enabled');
        cy.get(ABOUT_EDIT_TAB).should('be.enabled');
        cy.get(SCHEDULE_EDIT_TAB).should('be.enabled');
        cy.get(ACTIONS_EDIT_TAB).should('be.enabled');
      });

      describe('user can bulk edit prebuilt rules from rules management page', () => {
        it('add index patterns', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditAddIndexPatternsForm();
          typeIndexPatterns(['test-pattern']);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('delete index patterns', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditDeleteIndexPatternsForm();
          typeIndexPatterns([getIndexPatterns()[0]]);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('add tags', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditAddTagsForm();
          typeTags(['custom-tag']);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('delete tags', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditDeleteTagsForm();
          typeTags([testTags[0]]);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('add custom highlighted fields', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditAddInvestigationFieldsForm();
          typeInvestigationFields(['host.name']);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('delete custom highlighted fields', () => {
          filterByElasticRules();
          selectAllRules();

          openBulkEditDeleteInvestigationFieldsForm();
          typeInvestigationFields(['source.ip']);
          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('modify rule schedules', () => {
          filterByElasticRules();
          selectAllRules();

          clickUpdateScheduleMenuItem();

          typeScheduleInterval('20');
          setScheduleIntervalTimeUnit('Hours');

          typeScheduleLookback('10');
          setScheduleLookbackTimeUnit('Minutes');

          submitBulkEditForm();

          waitForBulkEditActionToFinish({
            updatedCount: 1,
          });

          expectToContainModifiedBadge('Non-customized prebuilt rule');
        });
      });

      describe('calculating the Modified badge', () => {
        it('modified badge should appear on the rule details page when prebuilt rule is customized', function () {
          patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
          visitRulesManagementTable();

          cy.get(RULE_NAME).contains('Customized prebuilt rule').click();
          expectModifiedBadgeToBeDisplayed(); // Expect modified badge to be displayed
        });

        it("modified badge should not appear on the rule details page when prebuilt rule isn't customized", function () {
          visitRulesManagementTable();

          cy.get(RULE_NAME).contains('Non-customized prebuilt rule').click();
          expectModifiedBadgeToNotBeDisplayed(); // Expect modified badge to not be displayed
        });

        it("modified badge should not appear on a custom rule's rule details page", function () {
          visitRulesManagementTable();

          cy.get(RULE_NAME).contains('Custom rule').click();
          expectModifiedBadgeToNotBeDisplayed(); // Expect modified badge to not be displayed
        });

        it('modified badge should appear on the rule management table when prebuilt rule is modified', function () {
          patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
          visitRulesManagementTable();

          filterByElasticRules();
          expectToContainModifiedBadge('Customized prebuilt rule');
        });

        it("modified badge should not appear on the rule management table when prebuilt rule isn't customized", function () {
          visitRulesManagementTable();

          filterByElasticRules();
          expectToNotContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('modified badge should not appear on the rule management table when row is a custom rule', function () {
          visitRulesManagementTable();

          filterByCustomRules();
          expectToNotContainModifiedBadge('Custom rule');
        });

        it('modified badge should appear on the rule updates table when prebuilt rule is customized', function () {
          // Create a new version of the rule to trigger the rule update logic
          installPrebuiltRuleAssets([
            {
              ...PREBUILT_RULE,
              'security-rule': { ...PREBUILT_RULE['security-rule'], version: 2 },
            },
          ]);
          patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
          visitRulesManagementTable();
          clickRuleUpdatesTab();

          cy.get(MODIFIED_RULE_BADGE).should('exist');
        });

        it("Modified badge should not appear on the rule updates table when prebuilt rule isn't customized", function () {
          // Create a new version of the rule to trigger the rule update logic
          installPrebuiltRuleAssets([
            {
              ...PREBUILT_RULE,
              'security-rule': { ...PREBUILT_RULE['security-rule'], version: 2 },
            },
          ]);
          visitRulesManagementTable();
          clickRuleUpdatesTab();

          cy.get(MODIFIED_RULE_BADGE).should('not.exist');
        });
      });
    });
  }
);
