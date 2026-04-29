/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setUpRuleUpgrades } from '../../../../../tasks/prebuilt_rules/setup_rule_upgrades';
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
} from '../../../../../tasks/rules_bulk_actions';
import {
  ABOUT_EDIT_TAB,
  ACTIONS_EDIT_TAB,
  DEFINITION_EDIT_TAB,
  SCHEDULE_EDIT_TAB,
} from '../../../../../screens/create_new_rule';
import {
  ABOUT_RULE_DESCRIPTION,
  MODIFIED_PREBUILT_RULE_BADGE,
  MODIFIED_PREBUILT_RULE_BADGE_NO_BASE_VERSION,
  MODIFIED_PREBUILT_RULE_PER_FIELD_BADGE,
  RULE_CUSTOMIZATIONS_DIFF_FLYOUT,
} from '../../../../../screens/rule_details';
import { goToRuleEditSettings, visitRuleDetailsPage } from '../../../../../tasks/rule_details';
import { getIndexPatterns, getCustomQueryRuleParams } from '../../../../../objects/rule';
import {
  editFirstRule,
  expectModifiedRuleBadgeToBeDisplayed,
  expectModifiedRuleBadgeToNotBeDisplayed,
  expectModifiedRulePerFieldBadgeToBeDisplayed,
  expectModifiedRulePerFieldBadgeToNotBeDisplayed,
  expectToContainModifiedBadge,
  expectToNotContainModifiedBadge,
  filterByCustomRules,
  filterByElasticRules,
  selectAllRules,
} from '../../../../../tasks/alerts_detection_rules';
import { MODIFIED_RULE_BADGE } from '../../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  installMockPrebuiltRulesPackage,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { createRule, patchRule, readRule } from '../../../../../tasks/api_calls/rules';

import { login } from '../../../../../tasks/login';

import {
  visitRulesManagementTable,
  visitRulesUpgradeTable,
} from '../../../../../tasks/rules_management';
import { fillDescription, goToAboutStepTab } from '../../../../../tasks/create_new_rule';
import { saveEditedRule, visitRuleEditPage } from '../../../../../tasks/edit_rule';

describe(
  'Detection rules, Prebuilt Rules Customization workflow',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },

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
    const NEW_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
      name: 'New Non-customized prebuilt rule',
      rule_id: PREBUILT_RULE_ID,
      version: 2,
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
          name: 'Custom rule',
          index: getIndexPatterns(),
          tags: testTags,
          enabled: false,
        })
      )
        .then(({ body: createdRule }) => createdRule.id)
        .as('customRuleId');

      // Read and save just installed prebuilt rule's rule_id
      readRule({ ruleId: PREBUILT_RULE_ID })
        .then(({ body: prebuiltRule }) => prebuiltRule.id)
        .as('prebuiltRuleId');

      login();
    });

    describe('navigation to the rule editing page', () => {
      it('navigates from the rule details page', () => {
        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleDetailsPage(prebuiltRuleId)
        );

        goToRuleEditSettings();
        cy.get(DEFINITION_EDIT_TAB).should('be.enabled');
        cy.get(ABOUT_EDIT_TAB).should('be.enabled');
        cy.get(SCHEDULE_EDIT_TAB).should('be.enabled');
        cy.get(ACTIONS_EDIT_TAB).should('be.enabled');
      });

      it('navigates from the rule management page', () => {
        visitRulesManagementTable();

        filterByElasticRules();
        editFirstRule();

        cy.get(DEFINITION_EDIT_TAB).should('be.enabled');
        cy.get(ABOUT_EDIT_TAB).should('be.enabled');
        cy.get(SCHEDULE_EDIT_TAB).should('be.enabled');
        cy.get(ACTIONS_EDIT_TAB).should('be.enabled');
      });
    });

    describe('editing a single prebuilt rule on the rule edit page', () => {
      it('edits a non-customized prebuilt rule', () => {
        const newDescriptionValue = 'New rule description';

        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleEditPage(prebuiltRuleId)
        );

        goToAboutStepTab();
        fillDescription(newDescriptionValue);
        saveEditedRule();

        expectModifiedRuleBadgeToBeDisplayed();
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newDescriptionValue);
      });

      it('edits a customized prebuilt rule', () => {
        const newDescriptionValue = 'New rule description';
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule

        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleEditPage(prebuiltRuleId)
        );

        goToAboutStepTab();
        fillDescription(newDescriptionValue);
        saveEditedRule();

        expectModifiedRuleBadgeToBeDisplayed();
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newDescriptionValue);
      });
    });

    describe('bulk editing prebuilt rules from the rules management page', () => {
      beforeEach(() => {
        visitRulesManagementTable();
      });

      it('adds index patterns', () => {
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

      it('deletes index patterns', () => {
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

      it('adds tags', () => {
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

      it('deletes tags', () => {
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

      it('adds custom highlighted fields', () => {
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

      it('deletes custom highlighted fields', () => {
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

      it('modifies rule schedules', () => {
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
      describe('on the rule details page', () => {
        it('should open the rule diff flyout on click when rule is customized', function () {
          patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule

          cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
            visitRuleDetailsPage(prebuiltRuleId)
          );

          expectModifiedRuleBadgeToBeDisplayed(); // Expect modified badge to be displayed
          cy.get(MODIFIED_PREBUILT_RULE_BADGE).click();
          cy.get(RULE_CUSTOMIZATIONS_DIFF_FLYOUT).should('exist');
        });

        it('should not open the rule diff flyout on click when rule is customized but base version does not exist', function () {
          patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
          deletePrebuiltRulesAssets();

          cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
            visitRuleDetailsPage(prebuiltRuleId)
          );

          cy.get(MODIFIED_PREBUILT_RULE_BADGE_NO_BASE_VERSION).should('exist'); // Expect modified badge to be displayed
          cy.get(MODIFIED_PREBUILT_RULE_BADGE_NO_BASE_VERSION).click();
          cy.get(RULE_CUSTOMIZATIONS_DIFF_FLYOUT).should('not.exist');
        });

        it("should not be displayed when rule isn't customized", function () {
          cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
            visitRuleDetailsPage(prebuiltRuleId)
          );

          expectModifiedRuleBadgeToNotBeDisplayed(); // Expect modified badge to not be displayed
        });

        it('should not be displayed when rule is not prebuilt', function () {
          cy.get<string>('@customRuleId').then((customRuleId) =>
            visitRuleDetailsPage(customRuleId)
          );

          expectModifiedRuleBadgeToNotBeDisplayed(); // Expect modified badge to not be displayed
        });
      });

      describe('on the rule management table', () => {
        it('should be displayed in row when prebuilt rule is customized', function () {
          patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
          visitRulesManagementTable();

          filterByElasticRules();
          expectToContainModifiedBadge('Customized prebuilt rule');
        });

        it("should not be displayed in row when prebuilt rule isn't customized", function () {
          visitRulesManagementTable();

          filterByElasticRules();
          expectToNotContainModifiedBadge('Non-customized prebuilt rule');
        });

        it('should not be displayed in row when rule is not prebuilt', function () {
          visitRulesManagementTable();

          filterByCustomRules();
          expectToNotContainModifiedBadge('Custom rule');
        });
      });

      describe('on the rule updates table', () => {
        it('should be displayed when prebuilt rule is customized', function () {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [
              {
                rule_id: PREBUILT_RULE_ID,
                name: 'Customized prebuilt rule',
              },
            ],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });

          visitRulesUpgradeTable();

          cy.get(MODIFIED_RULE_BADGE).should('exist');
        });

        it("should not be displayed when prebuilt rule isn't customized", function () {
          setUpRuleUpgrades({
            currentRuleAssets: [PREBUILT_RULE_ASSET],
            rulePatches: [],
            newRuleAssets: [NEW_PREBUILT_RULE_ASSET],
          });

          visitRulesUpgradeTable();

          cy.get(MODIFIED_RULE_BADGE).should('not.exist');
        });
      });
    });

    describe('calculating the per-field modified badge', () => {
      it('should appear next to fields that have been customized', function () {
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule', tags: ['test'] }); // We want to make this a customized prebuilt rule

        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleDetailsPage(prebuiltRuleId)
        );

        expectModifiedRulePerFieldBadgeToBeDisplayed('tags'); // Customized fields should have a badge present
        expectModifiedRulePerFieldBadgeToNotBeDisplayed('max_signals'); // Non-customized fields should not have a badge present
      });

      it('should open the rule customizations diff flyout on click', function () {
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule', tags: ['test'] }); // We want to make this a customized prebuilt rule

        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleDetailsPage(prebuiltRuleId)
        );

        cy.get(MODIFIED_PREBUILT_RULE_PER_FIELD_BADGE('tags')).click();
        cy.get(RULE_CUSTOMIZATIONS_DIFF_FLYOUT).should('exist');
      });

      it('should not be displayed when the rule base version does not exist', function () {
        patchRule(PREBUILT_RULE_ID, { name: 'Customized prebuilt rule', tags: ['test'] }); // We want to make this a customized prebuilt rule
        deletePrebuiltRulesAssets();

        cy.get<string>('@prebuiltRuleId').then((prebuiltRuleId) =>
          visitRuleDetailsPage(prebuiltRuleId)
        );

        expectModifiedRulePerFieldBadgeToNotBeDisplayed('tags');
      });
    });
  }
);
