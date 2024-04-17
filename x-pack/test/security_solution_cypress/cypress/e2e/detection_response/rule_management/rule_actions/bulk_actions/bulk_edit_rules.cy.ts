/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import {
  MODAL_CONFIRMATION_BTN,
  MODAL_CONFIRMATION_BODY,
  RULES_TAGS_POPOVER_BTN,
  MODAL_ERROR_BODY,
} from '../../../../../screens/alerts_detection_rules';

import {
  RULES_BULK_EDIT_INDEX_PATTERNS_WARNING,
  RULES_BULK_EDIT_TAGS_WARNING,
  RULES_BULK_EDIT_TIMELINE_TEMPLATES_WARNING,
  TAGS_RULE_BULK_MENU_ITEM,
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  APPLY_TIMELINE_RULE_BULK_MENU_ITEM,
} from '../../../../../screens/rules_bulk_actions';

import { TIMELINE_TEMPLATE_DETAILS } from '../../../../../screens/rule_details';

import { EUI_CHECKBOX, EUI_FILTER_SELECT_ITEM } from '../../../../../screens/common/controls';

import {
  selectAllRules,
  goToRuleDetailsOf,
  testAllTagsBadges,
  testTagsBadge,
  testMultipleSelectedRulesLabel,
  filterByElasticRules,
  clickErrorToastBtn,
  cancelConfirmationModal,
  selectRulesByName,
  getRulesManagementTableRows,
  selectAllRulesOnPage,
  getRuleRow,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';

import {
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  clickAddIndexPatternsMenuItem,
  checkPrebuiltRulesCannotBeModified,
  checkMachineLearningRulesCannotBeModified,
  checkEsqlRulesCannotBeModified,
  waitForMixedRulesBulkEditModal,
  openBulkEditAddTagsForm,
  openBulkEditDeleteTagsForm,
  typeTags,
  openTagsSelect,
  openBulkActionsMenu,
  clickApplyTimelineTemplatesMenuItem,
  clickAddTagsMenuItem,
  checkOverwriteTagsCheckbox,
  checkOverwriteIndexPatternsCheckbox,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
  selectTimelineTemplate,
  checkTagsInTagsFilter,
  clickUpdateScheduleMenuItem,
  typeScheduleInterval,
  typeScheduleLookback,
  setScheduleLookbackTimeUnit,
  setScheduleIntervalTimeUnit,
  assertRuleScheduleValues,
  assertUpdateScheduleWarningExists,
  assertDefaultValuesAreAppliedToScheduleFields,
} from '../../../../../tasks/rules_bulk_actions';

import { createRuleAssetSavedObject } from '../../../../../helpers/rules';
import { hasIndexPatterns, getDetails } from '../../../../../tasks/rule_details';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { loadPrepackagedTimelineTemplates } from '../../../../../tasks/api_calls/timelines';
import { resetRulesTableState } from '../../../../../tasks/common';

import {
  getEqlRule,
  getEsqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../../../../objects/rule';

import {
  createAndInstallMockedPrebuiltRules,
  getAvailablePrebuiltRulesCount,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { setRowsPerPageTo, sortByTableColumn } from '../../../../../tasks/table_pagination';

const RULE_NAME = 'Custom rule for bulk actions';
const EUI_SELECTABLE_LIST_ITEM_SR_TEXT = '. To check this option, press Enter.';

const prePopulatedIndexPatterns = ['index-1-*', 'index-2-*'];
const prePopulatedTags = ['test-default-tag-1', 'test-default-tag-2'];

const expectedNumberOfMachineLearningRulesToBeEdited = 1;

const defaultRuleData = {
  index: prePopulatedIndexPatterns,
  tags: prePopulatedTags,
  timeline_title: 'Generic Threat Match Timeline',
  timeline_id: '495ad7a7-316e-4544-8a0f-9c098daee76e',
};

describe('Detection rules, bulk edit', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    preventPrebuiltRulesPackageInstallation(); // Make sure prebuilt rules aren't pulled from Fleet API
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    createRule(getNewRule({ name: RULE_NAME, ...defaultRuleData, rule_id: '1', enabled: false }));
    createRule(
      getEqlRule({ ...defaultRuleData, rule_id: '2', name: 'New EQL Rule', enabled: false })
    );
    createRule(
      getMachineLearningRule({
        name: 'New ML Rule Test',
        tags: ['test-default-tag-1', 'test-default-tag-2'],
        enabled: false,
      })
    );
    createRule(
      getNewThreatIndicatorRule({
        ...defaultRuleData,
        rule_id: '4',
        name: 'Threat Indicator Rule Test',
        enabled: false,
      })
    );
    createRule(
      getNewThresholdRule({
        ...defaultRuleData,
        rule_id: '5',
        name: 'Threshold Rule',
        enabled: false,
      })
    );
    createRule(
      getNewTermsRule({
        ...defaultRuleData,
        rule_id: '6',
        name: 'New Terms Rule',
        enabled: false,
      })
    );

    visitRulesManagementTable();
    disableAutoRefresh();
  });

  describe('Prerequisites', () => {
    const PREBUILT_RULES = [
      createRuleAssetSavedObject({
        name: 'Prebuilt rule 1',
        rule_id: 'rule_1',
      }),
      createRuleAssetSavedObject({
        name: 'Prebuilt rule 2',
        rule_id: 'rule_2',
      }),
    ];

    it('No rules selected', () => {
      openBulkActionsMenu();

      // when no rule selected all bulk edit options should be disabled
      cy.get(TAGS_RULE_BULK_MENU_ITEM).should('be.disabled');
      cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).should('be.disabled');
      cy.get(APPLY_TIMELINE_RULE_BULK_MENU_ITEM).should('be.disabled');
    });

    // github.com/elastic/kibana/issues/179954
    it('Only prebuilt rules selected', { tags: ['@skipInServerless'] }, () => {
      createAndInstallMockedPrebuiltRules(PREBUILT_RULES);

      // select Elastic(prebuilt) rules, check if we can't proceed further, as Elastic rules are not editable
      filterByElasticRules();
      selectAllRulesOnPage();
      clickApplyTimelineTemplatesMenuItem();

      getRulesManagementTableRows().then((rows) => {
        // check modal window for Elastic rule that can't be edited
        checkPrebuiltRulesCannotBeModified(rows.length);

        // the confirm button closes modal
        cy.get(MODAL_CONFIRMATION_BTN).should('have.text', 'Close').click();
        cy.get(MODAL_CONFIRMATION_BODY).should('not.exist');
      });
    });

    // https://github.com/elastic/kibana/issues/179955
    it(
      'Prebuilt and custom rules selected: user proceeds with custom rules editing',
      { tags: ['@skipInServerless'] },
      () => {
        getRulesManagementTableRows().then((existedRulesRows) => {
          createAndInstallMockedPrebuiltRules(PREBUILT_RULES);

          // modal window should show how many rules can be edit, how many not
          selectAllRules();
          clickAddTagsMenuItem();

          waitForMixedRulesBulkEditModal(existedRulesRows.length);

          getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
            checkPrebuiltRulesCannotBeModified(availablePrebuiltRulesCount);
          });

          // user can proceed with custom rule editing
          cy.get(MODAL_CONFIRMATION_BTN)
            .should('have.text', `Edit ${existedRulesRows.length} custom rules`)
            .click();

          // action should finish
          typeTags(['test-tag']);
          submitBulkEditForm();
          waitForBulkEditActionToFinish({ updatedCount: existedRulesRows.length });
        });
      }
    );

    // https://github.com/elastic/kibana/issues/179956
    it(
      'Prebuilt and custom rules selected: user cancels action',
      { tags: ['@skipInServerless'] },
      () => {
        createAndInstallMockedPrebuiltRules(PREBUILT_RULES);

        getRulesManagementTableRows().then((rows) => {
          // modal window should show how many rules can be edit, how many not
          selectAllRules();
          clickAddTagsMenuItem();
          waitForMixedRulesBulkEditModal(rows.length);

          checkPrebuiltRulesCannotBeModified(PREBUILT_RULES.length);

          // user cancels action and modal disappears
          cancelConfirmationModal();
        });
      }
    );

    it('should not lose rules selection after edit action', () => {
      const rulesToUpdate = [RULE_NAME, 'New EQL Rule', 'New Terms Rule'] as const;
      // Switch to 5 rules per page, to have few pages in pagination(ideal way to test auto refresh and selection of few items)
      setRowsPerPageTo(5);
      // and make the rules order isn't changing (set sorting by rule name) over time if rules are run
      sortByTableColumn('Rule');
      selectRulesByName(rulesToUpdate);

      // open add tags form and add 2 new tags
      openBulkEditAddTagsForm();
      typeTags(['new-tag-1']);
      submitBulkEditForm();
      waitForBulkEditActionToFinish({ updatedCount: rulesToUpdate.length });

      testMultipleSelectedRulesLabel(rulesToUpdate.length);
      // check if first four(rulesCount) rules still selected and tags are updated
      for (const ruleName of rulesToUpdate) {
        getRuleRow(ruleName).find(EUI_CHECKBOX).should('be.checked');
        getRuleRow(ruleName)
          .find(RULES_TAGS_POPOVER_BTN)
          .each(($el) => {
            testTagsBadge($el, prePopulatedTags.concat(['new-tag-1']));
          });
      }
    });
  });

  describe('Tags actions', () => {
    it('Display list of tags in tags select', () => {
      selectAllRules();

      openBulkEditAddTagsForm();
      openTagsSelect();

      cy.get(EUI_FILTER_SELECT_ITEM)
        .should('have.length', prePopulatedTags.length)
        .each(($el, index) => {
          cy.wrap($el).should('have.text', prePopulatedTags[index]);
        });
    });

    it('Add tags to custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];
        const resultingTags = [...prePopulatedTags, ...tagsToBeAdded];

        // check if only pre-populated tags exist in the tags filter
        checkTagsInTagsFilter(prePopulatedTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);

        selectAllRules();

        // open add tags form and add 2 new tags
        openBulkEditAddTagsForm();
        typeTags(tagsToBeAdded);
        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if all rules have been updated with new tags
        testAllTagsBadges(resultingTags);

        // check that new tags were added to tags filter
        // tags in tags filter sorted alphabetically
        const resultingTagsInFilter = [...resultingTags].sort();
        checkTagsInTagsFilter(resultingTagsInFilter, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);
      });
    });

    it('Display success toast after adding tags', () => {
      getRulesManagementTableRows().then((rows) => {
        const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];

        // check if only pre-populated tags exist in the tags filter
        checkTagsInTagsFilter(prePopulatedTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);

        selectAllRules();

        // open add tags form and add 2 new tags
        openBulkEditAddTagsForm();
        typeTags(tagsToBeAdded);
        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });
      });
    });

    it('Overwrite tags in custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const tagsToOverwrite = ['overwrite-tag-1'];

        // check if only pre-populated tags exist in the tags filter
        checkTagsInTagsFilter(prePopulatedTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);

        selectAllRules();

        // open add tags form, check overwrite tags and warning message, type tags
        openBulkEditAddTagsForm();
        checkOverwriteTagsCheckbox();

        cy.get(RULES_BULK_EDIT_TAGS_WARNING).should(
          'have.text',
          `You’re about to overwrite tags for ${rows.length} selected rules, press Save to apply changes.`
        );

        typeTags(tagsToOverwrite);
        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if all rules have been updated with new tags
        testAllTagsBadges(tagsToOverwrite);

        // check that only new tags are in the tag filter
        checkTagsInTagsFilter(tagsToOverwrite, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);
      });
    });

    it('Delete tags from custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const tagsToDelete = prePopulatedTags.slice(0, 1);
        const resultingTags = prePopulatedTags.slice(1);

        // check if only pre-populated tags exist in the tags filter
        checkTagsInTagsFilter(prePopulatedTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);

        selectAllRules();

        // open add tags form, check overwrite tags, type tags
        openBulkEditDeleteTagsForm();
        typeTags(tagsToDelete);
        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check tags has been removed from all rules
        testAllTagsBadges(resultingTags);

        // check that tags were removed from the tag filter
        checkTagsInTagsFilter(resultingTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);
      });
    });
  });

  describe('Index patterns', () => {
    it('Index pattern action applied to custom rules, including machine learning: user proceeds with edit of custom non machine learning rule', () => {
      getRulesManagementTableRows().then((rows) => {
        const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];
        const resultingIndexPatterns = [...prePopulatedIndexPatterns, ...indexPattersToBeAdded];

        selectAllRules();
        clickAddIndexPatternsMenuItem();

        // confirm editing custom rules, that are not Machine Learning
        checkMachineLearningRulesCannotBeModified(expectedNumberOfMachineLearningRulesToBeEdited);
        cy.get(MODAL_CONFIRMATION_BTN).click();

        typeIndexPatterns(indexPattersToBeAdded);
        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          updatedCount: rows.length - expectedNumberOfMachineLearningRulesToBeEdited,
        });

        // check if rule has been updated
        goToRuleDetailsOf(RULE_NAME);
        hasIndexPatterns(resultingIndexPatterns.join(''));
      });
    });

    it('Index pattern action applied to custom rules, including machine learning: user cancels action', () => {
      selectAllRules();
      clickAddIndexPatternsMenuItem();

      // confirm editing custom rules, that are not Machine Learning
      checkMachineLearningRulesCannotBeModified(expectedNumberOfMachineLearningRulesToBeEdited);

      // user cancels action and modal disappears
      cancelConfirmationModal();
    });

    it('Add index patterns to custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];
        const resultingIndexPatterns = [...prePopulatedIndexPatterns, ...indexPattersToBeAdded];

        // select only rules that are not ML
        selectRulesByName([
          RULE_NAME,
          'New EQL Rule',
          'Threat Indicator Rule Test',
          'Threshold Rule',
          'New Terms Rule',
        ]);

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(indexPattersToBeAdded);
        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          updatedCount: rows.length - expectedNumberOfMachineLearningRulesToBeEdited,
        });

        // check if rule has been updated
        goToRuleDetailsOf(RULE_NAME);
        hasIndexPatterns(resultingIndexPatterns.join(''));
      });
    });

    it('Display success toast after editing the index pattern', () => {
      getRulesManagementTableRows().then((rows) => {
        const indexPattersToBeAdded = ['index-to-add-1-*', 'index-to-add-2-*'];

        // select only rules that are not ML
        selectRulesByName([
          RULE_NAME,
          'New EQL Rule',
          'Threat Indicator Rule Test',
          'Threshold Rule',
          'New Terms Rule',
        ]);

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(indexPattersToBeAdded);
        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          updatedCount: rows.length - expectedNumberOfMachineLearningRulesToBeEdited,
        });
      });
    });

    it('Overwrite index patterns in custom rules', () => {
      const rulesToSelect = [
        RULE_NAME,
        'New EQL Rule',
        'Threat Indicator Rule Test',
        'Threshold Rule',
        'New Terms Rule',
      ] as const;
      const indexPattersToWrite = ['index-to-write-1-*', 'index-to-write-2-*'];

      // select only rules that are not ML
      selectRulesByName(rulesToSelect);

      openBulkEditAddIndexPatternsForm();

      // check overwrite index patterns checkbox, ensure warning message is displayed and type index patterns
      checkOverwriteIndexPatternsCheckbox();
      cy.get(RULES_BULK_EDIT_INDEX_PATTERNS_WARNING).should(
        'have.text',
        `You’re about to overwrite index patterns for ${rulesToSelect.length} selected rules, press Save to apply changes.`
      );

      typeIndexPatterns(indexPattersToWrite);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ updatedCount: rulesToSelect.length });

      // check if rule has been updated
      goToRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(indexPattersToWrite.join(''));
    });

    it('Delete index patterns from custom rules', () => {
      const rulesToSelect = [
        RULE_NAME,
        'New EQL Rule',
        'Threat Indicator Rule Test',
        'Threshold Rule',
        'New Terms Rule',
      ] as const;
      const indexPatternsToDelete = prePopulatedIndexPatterns.slice(0, 1);
      const resultingIndexPatterns = prePopulatedIndexPatterns.slice(1);

      // select only not ML rules
      selectRulesByName(rulesToSelect);

      openBulkEditDeleteIndexPatternsForm();
      typeIndexPatterns(indexPatternsToDelete);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({ updatedCount: rulesToSelect.length });

      // check if rule has been updated
      goToRuleDetailsOf(RULE_NAME);
      hasIndexPatterns(resultingIndexPatterns.join(''));
    });

    it('Delete all index patterns from custom rules', () => {
      const rulesToSelect = [
        RULE_NAME,
        'New EQL Rule',
        'Threat Indicator Rule Test',
        'Threshold Rule',
        'New Terms Rule',
      ] as const;

      // select only rules that are not ML
      selectRulesByName(rulesToSelect);

      openBulkEditDeleteIndexPatternsForm();
      typeIndexPatterns(prePopulatedIndexPatterns);
      submitBulkEditForm();

      // error toast should be displayed that that rules edit failed
      waitForBulkEditActionToFinish({ failedCount: rulesToSelect.length });

      // on error toast button click display error that index patterns can't be empty
      clickErrorToastBtn();
      cy.contains(MODAL_ERROR_BODY, "Index patterns can't be empty");
    });
  });

  describe('Timeline templates', () => {
    beforeEach(() => {
      loadPrepackagedTimelineTemplates();
    });

    it('Apply timeline template to custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const timelineTemplateName = 'Generic Endpoint Timeline';

        selectAllRules();

        // open Timeline template form, check warning, select timeline template
        clickApplyTimelineTemplatesMenuItem();
        cy.get(RULES_BULK_EDIT_TIMELINE_TEMPLATES_WARNING).contains(
          `You're about to apply changes to ${rows.length} selected rules. If you previously applied Timeline templates to these rules, they will be overwritten or (if you select 'None') reset to none.`
        );
        selectTimelineTemplate(timelineTemplateName);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if timeline template has been updated to selected one
        goToRuleDetailsOf(RULE_NAME);
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', timelineTemplateName);
      });
    });

    it('Reset timeline template to None for custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        const noneTimelineTemplate = 'None';

        selectAllRules();

        // open Timeline template form, submit form without picking timeline template as None is selected by default
        clickApplyTimelineTemplatesMenuItem();

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if timeline template has been updated to selected one, by opening rule that have had timeline prior to editing
        goToRuleDetailsOf(RULE_NAME);
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', noneTimelineTemplate);
      });
    });
  });

  describe('Schedule', () => {
    it('Default values are applied to bulk edit schedule fields', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickUpdateScheduleMenuItem();

        assertUpdateScheduleWarningExists(rows.length);

        assertDefaultValuesAreAppliedToScheduleFields({
          interval: 5,
          lookback: 1,
        });
      });
    });

    it('Updates schedule for custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickUpdateScheduleMenuItem();

        assertUpdateScheduleWarningExists(rows.length);

        typeScheduleInterval('20');
        setScheduleIntervalTimeUnit('Hours');

        typeScheduleLookback('10');
        setScheduleLookbackTimeUnit('Minutes');

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        goToRuleDetailsOf(RULE_NAME);

        assertRuleScheduleValues({
          interval: '20h',
          lookback: '10m',
        });
      });
    });

    it('Validates invalid inputs when scheduling for custom rules', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickUpdateScheduleMenuItem();

        // Validate invalid values are corrected to minimumValue - for 0 and negative values
        typeScheduleInterval('0');
        setScheduleIntervalTimeUnit('Hours');

        typeScheduleLookback('-5');
        setScheduleLookbackTimeUnit('Seconds');

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        goToRuleDetailsOf(RULE_NAME);

        assertRuleScheduleValues({
          interval: '1h',
          lookback: '1s',
        });
      });
    });
  });
});

// ES|QL rule type is supported  only in ESS environment
// Adding 2 use cases only for this rule type, while it is disabled on serverless
// Created these limited separate scenarios, is done for purpose not duplicating existing tests with new rule type added only for ESS env
// as they will fail when enabled on serverless
// Having 2 sets of complete scenarios for both envs would have a high maintenance cost
// When ES|QL enabled on serverless this rule type can be added to complete set of tests, with minimal changes to tests itself (adding creation of new rule, change number of expected rules, etc)
describe('Detection rules, bulk edit, ES|QL rule type', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    preventPrebuiltRulesPackageInstallation(); // Make sure prebuilt rules aren't pulled from Fleet API
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    createRule(
      getEsqlRule({
        tags: ['test-default-tag-1', 'test-default-tag-2'],
        enabled: false,
      })
    );
    visitRulesManagementTable();
    disableAutoRefresh();
  });

  describe('Tags actions', () => {
    // ensures bulk edit action is applied to the rule type
    it('Add tags to ES|QL rule', { tags: ['@ess'] }, () => {
      getRulesManagementTableRows().then((rows) => {
        const tagsToBeAdded = ['tag-to-add-1', 'tag-to-add-2'];
        const resultingTags = [...prePopulatedTags, ...tagsToBeAdded];

        // check if only pre-populated tags exist in the tags filter
        checkTagsInTagsFilter(prePopulatedTags, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);

        selectAllRules();

        // open add tags form and add 2 new tags
        openBulkEditAddTagsForm();
        typeTags(tagsToBeAdded);
        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if all rules have been updated with new tags
        testAllTagsBadges(resultingTags);

        // check that new tags were added to tags filter
        // tags in tags filter sorted alphabetically
        const resultingTagsInFilter = [...resultingTags].sort();
        checkTagsInTagsFilter(resultingTagsInFilter, EUI_SELECTABLE_LIST_ITEM_SR_TEXT);
      });
    });
  });

  describe('Index patterns', () => {
    it(
      'Index pattern action applied to ES|QL rules, user cancels action',
      { tags: ['@ess'] },
      () => {
        selectAllRules();
        clickAddIndexPatternsMenuItem();

        // confirm editing custom rules, that are not Machine Learning
        checkEsqlRulesCannotBeModified(1);

        // user cancels action and modal disappears
        cancelConfirmationModal();
      }
    );
  });
});
