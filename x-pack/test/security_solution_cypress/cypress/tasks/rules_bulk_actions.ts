/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';

import {
  CONFIRM_DELETE_RULE_BTN,
  CONFIRM_DUPLICATE_RULE,
  CONFIRM_MANUAL_RULE_RUN_WARNING_BTN,
  DUPLICATE_WITHOUT_EXCEPTIONS_OPTION,
  DUPLICATE_WITH_EXCEPTIONS_OPTION,
  DUPLICATE_WITH_EXCEPTIONS_WITHOUT_EXPIRED_OPTION,
  MODAL_CONFIRMATION_BODY,
  MODAL_CONFIRMATION_BTN,
  MODAL_CONFIRMATION_TITLE,
  RULES_TAGS_FILTER_BTN,
  TOASTER_BODY,
} from '../screens/alerts_detection_rules';
import { EUI_SELECTABLE_LIST_ITEM, TIMELINE_SEARCHBOX } from '../screens/common/controls';
import {
  ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  ADD_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM,
  ADD_RULE_ACTIONS_MENU_ITEM,
  ADD_TAGS_RULE_BULK_MENU_ITEM,
  APPLY_TIMELINE_RULE_BULK_MENU_ITEM,
  BULK_ACTIONS_BTN,
  BULK_ACTIONS_PROGRESS_BTN,
  BULK_EXPORT_ACTION_BTN,
  DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  DELETE_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM,
  DELETE_RULE_BULK_BTN,
  DELETE_TAGS_RULE_BULK_MENU_ITEM,
  DISABLE_RULE_BULK_BTN,
  DUPLICATE_RULE_BULK_BTN,
  ENABLE_RULE_BULK_BTN,
  INDEX_PATTERNS_RULE_BULK_MENU_ITEM,
  INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM,
  RULES_BULK_EDIT_FORM_CONFIRM_BTN,
  RULES_BULK_EDIT_FORM_TITLE,
  RULES_BULK_EDIT_INDEX_PATTERNS,
  RULES_BULK_EDIT_INVESTIGATION_FIELDS,
  RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_INVESTIGATION_FIELDS_CHECKBOX,
  RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX,
  RULES_BULK_EDIT_SCHEDULES_WARNING,
  RULES_BULK_EDIT_TAGS,
  RULES_BULK_EDIT_TIMELINE_TEMPLATES_SELECTOR,
  BULK_MANUAL_RULE_RUN_BTN,
  BULK_MANUAL_RULE_RUN_WARNING_MODAL,
  TAGS_RULE_BULK_MENU_ITEM,
  UPDATE_SCHEDULE_INTERVAL_INPUT,
  UPDATE_SCHEDULE_LOOKBACK_INPUT,
  UPDATE_SCHEDULE_MENU_ITEM,
  UPDATE_SCHEDULE_TIME_UNIT_SELECT,
} from '../screens/rules_bulk_actions';
import { SCHEDULE_DETAILS } from '../screens/rule_details';

// DELETE
export const deleteSelectedRules = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(DELETE_RULE_BULK_BTN).click();
  cy.get(CONFIRM_DELETE_RULE_BTN).click();
};

// DUPLICATE
export const duplicateSelectedRulesWithoutExceptions = () => {
  cy.log('Bulk duplicate selected rules without exceptions');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(DUPLICATE_RULE_BULK_BTN).click();
  cy.get(DUPLICATE_WITHOUT_EXCEPTIONS_OPTION).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

export const duplicateSelectedRulesWithExceptions = () => {
  cy.log('Bulk duplicate selected rules with exceptions');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(DUPLICATE_RULE_BULK_BTN).click();
  cy.get(DUPLICATE_WITH_EXCEPTIONS_OPTION).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

export const duplicateSelectedRulesWithNonExpiredExceptions = () => {
  cy.log('Bulk duplicate selected rules with non expired exceptions');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(DUPLICATE_RULE_BULK_BTN).click();
  cy.get(DUPLICATE_WITH_EXCEPTIONS_WITHOUT_EXPIRED_OPTION).click();
  cy.get(CONFIRM_DUPLICATE_RULE).click();
};

// ENABLE/DISABLE
export const enableSelectedRules = () => {
  cy.log('Bulk enable selected rules');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(ENABLE_RULE_BULK_BTN).click();
};

export const disableSelectedRules = () => {
  cy.log('Bulk disable selected rules');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(DISABLE_RULE_BULK_BTN).click();
};

// EXPORT
export const bulkExportRules = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(BULK_EXPORT_ACTION_BTN).click();
};

// EDIT-TIMELINE
export const clickApplyTimelineTemplatesMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(APPLY_TIMELINE_RULE_BULK_MENU_ITEM).click();
  cy.get(APPLY_TIMELINE_RULE_BULK_MENU_ITEM).should('not.exist');
};

export const selectTimelineTemplate = (timelineTitle: string) => {
  recurse(
    () => {
      cy.get(RULES_BULK_EDIT_TIMELINE_TEMPLATES_SELECTOR).click();
      cy.get(TIMELINE_SEARCHBOX).clear();
      cy.get(TIMELINE_SEARCHBOX).type(`${timelineTitle}{enter}`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      return cy.get(TIMELINE_SEARCHBOX).should(Cypress._.noop);
    },
    ($el) => !$el.length
  );
};

// EDIT-INDEX
const clickIndexPatternsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).should('not.exist');
};

export const clickAddIndexPatternsMenuItem = () => {
  clickIndexPatternsMenuItem();
  cy.get(ADD_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
};

export const openBulkEditAddIndexPatternsForm = () => {
  clickAddIndexPatternsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add index patterns');
};

export const openBulkEditDeleteIndexPatternsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();
  cy.get(DELETE_INDEX_PATTERNS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete index patterns');
};

export const typeIndexPatterns = (indices: string[]) => {
  cy.get(RULES_BULK_EDIT_INDEX_PATTERNS).find('input').type(indices.join('{enter}'));
};

export const checkOverwriteIndexPatternsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' index patterns")
    .click();
  cy.get(RULES_BULK_EDIT_OVERWRITE_INDEX_PATTERNS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' index patterns")
    .get('input')
    .should('be.checked');
};

export const checkOverwriteDataViewCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX)
    .should('have.text', 'Apply changes to rules configured with data views')
    .click();

  cy.get(RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX)
    .should('have.text', 'Apply changes to rules configured with data views')
    .get('input')
    .should('be.checked');
};

// EDIT-TAGS
const clickTagsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(TAGS_RULE_BULK_MENU_ITEM).click();
};

export const clickAddTagsMenuItem = () => {
  clickTagsMenuItem();
  cy.get(ADD_TAGS_RULE_BULK_MENU_ITEM).click();
};

export const openBulkEditAddTagsForm = () => {
  clickAddTagsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add tags');
};

export const openBulkEditDeleteTagsForm = () => {
  clickTagsMenuItem();
  cy.get(DELETE_TAGS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete tags');
};

export const typeTags = (tags: string[]) => {
  cy.get(RULES_BULK_EDIT_TAGS).find('input').type(tags.join('{enter}'));
};

export const openTagsSelect = () => {
  cy.get(RULES_BULK_EDIT_TAGS).find('input').click();
};

export const checkOverwriteTagsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' tags")
    .click();
  cy.get(RULES_BULK_EDIT_OVERWRITE_TAGS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' tags")
    .get('input')
    .should('be.checked');
};

/**
 * check if rule tags filter populated with a list of tags
 * @param tags
 * @param srOnlyText SR-only text appended by EUI
 */
export const checkTagsInTagsFilter = (tags: string[], srOnlyText: string = '') => {
  cy.get(RULES_TAGS_FILTER_BTN).contains(`Tags${tags.length}`).click();

  cy.get(EUI_SELECTABLE_LIST_ITEM)
    .should('have.length', tags.length)
    .each(($el, index) => {
      cy.wrap($el).should('have.text', `${tags[index]}${srOnlyText}`);
    });
};

// EDIT-INVESTIGATION FIELDS
const clickInvestigationFieldsMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM).click();
};

export const clickAddInvestigationFieldsMenuItem = () => {
  clickInvestigationFieldsMenuItem();
  cy.get(ADD_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM).click();
};

export const openBulkEditAddInvestigationFieldsForm = () => {
  clickAddInvestigationFieldsMenuItem();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add custom highlighted fields');
};

export const openBulkEditDeleteInvestigationFieldsForm = () => {
  clickInvestigationFieldsMenuItem();
  cy.get(DELETE_INVESTIGATION_FIELDS_RULE_BULK_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Delete custom highlighted fields');
};

export const typeInvestigationFields = (fields: string[]) => {
  cy.get(RULES_BULK_EDIT_INVESTIGATION_FIELDS)
    .find('input')
    .type(fields.join('{enter}') + '{enter}');
};

export const checkOverwriteInvestigationFieldsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_INVESTIGATION_FIELDS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' custom highlighted fields")
    .click();
  cy.get(RULES_BULK_EDIT_OVERWRITE_INVESTIGATION_FIELDS_CHECKBOX)
    .should('have.text', "Overwrite all selected rules' custom highlighted fields")
    .get('input')
    .should('be.checked');
};

// EDIT-SCHEDULE
export const clickUpdateScheduleMenuItem = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(UPDATE_SCHEDULE_MENU_ITEM).click();
  cy.get(UPDATE_SCHEDULE_MENU_ITEM).should('not.exist');
};

export const typeScheduleInterval = (interval: string) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).find('input').type(`{selectAll}${interval.toString()}`);
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).find('input').blur();
};

export const typeScheduleLookback = (lookback: string) => {
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT)
    .find('input')
    .type(`{selectAll}${lookback.toString()}`, { waitForAnimations: true });

  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT).find('input').blur();
};

interface ScheduleFormFields {
  interval: number;
  lookback: number;
}

export const assertDefaultValuesAreAppliedToScheduleFields = ({
  interval,
  lookback,
}: ScheduleFormFields) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).find('input').should('have.value', interval);
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT).find('input').should('have.value', lookback);
};

type TimeUnit = 'Seconds' | 'Minutes' | 'Hours';
export const setScheduleIntervalTimeUnit = (timeUnit: TimeUnit) => {
  cy.get(UPDATE_SCHEDULE_INTERVAL_INPUT).within(() => {
    cy.get(UPDATE_SCHEDULE_TIME_UNIT_SELECT).select(timeUnit);
  });
};

export const setScheduleLookbackTimeUnit = (timeUnit: TimeUnit) => {
  cy.get(UPDATE_SCHEDULE_LOOKBACK_INPUT).within(() => {
    cy.get(UPDATE_SCHEDULE_TIME_UNIT_SELECT).select(timeUnit);
  });
};

export const assertUpdateScheduleWarningExists = (expectedNumberOfNotMLRules: number) => {
  cy.get(RULES_BULK_EDIT_SCHEDULES_WARNING).should(
    'have.text',
    `You're about to apply changes to ${expectedNumberOfNotMLRules} selected rules. The changes you make will overwrite the existing rule schedules and additional look-back time (if any).`
  );
};
interface RuleSchedule {
  interval: string;
  lookback: string;
}

export const assertRuleScheduleValues = ({ interval, lookback }: RuleSchedule) => {
  cy.get(SCHEDULE_DETAILS).within(() => {
    cy.get('dd').eq(0).should('contain.text', interval);
    cy.get('dd').eq(1).should('contain.text', lookback);
  });
};

// EDIT-ACTIONS
export const openBulkEditRuleActionsForm = () => {
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(ADD_RULE_ACTIONS_MENU_ITEM).click();

  cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Add rule actions');
};

export const openBulkActionsMenu = () => {
  cy.get(BULK_ACTIONS_BTN).click();
};

export const checkOverwriteRuleActionsCheckbox = () => {
  cy.get(RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX)
    .should('have.text', 'Overwrite all selected rules actions')
    .find('input')
    .click({ force: true });
  cy.get(RULES_BULK_EDIT_OVERWRITE_ACTIONS_CHECKBOX)
    .should('have.text', 'Overwrite all selected rules actions')
    .find('input')
    .should('be.checked');
};

// EDIT-FORM
export const submitBulkEditForm = () => cy.get(RULES_BULK_EDIT_FORM_CONFIRM_BTN).click();

export const waitForBulkEditActionToFinish = ({
  updatedCount,
  skippedCount,
  failedCount,
  showDataViewsWarning = false,
}: {
  updatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  showDataViewsWarning?: boolean;
}) => {
  cy.get(BULK_ACTIONS_PROGRESS_BTN).should('be.disabled');

  if (updatedCount !== undefined) {
    cy.contains(TOASTER_BODY, `You've successfully updated ${updatedCount} rule`);
  }
  if (failedCount !== undefined) {
    if (failedCount === 1) {
      cy.contains(TOASTER_BODY, `${failedCount} rule failed to update`);
    } else {
      cy.contains(TOASTER_BODY, `${failedCount} rules failed to update`);
    }
  }
  if (skippedCount !== undefined) {
    if (skippedCount === 1) {
      cy.contains(TOASTER_BODY, `${skippedCount} rule was skipped`);
    } else {
      cy.contains(TOASTER_BODY, `${skippedCount} rules were skipped`);
    }
    if (showDataViewsWarning) {
      cy.contains(
        TOASTER_BODY,
        'If you did not select to apply changes to rules using Kibana data views, those rules were not updated and will continue using data views.'
      );
    }
  }
};

export const checkPrebuiltRulesCannotBeModified = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_BODY).contains(
    `${rulesCount} prebuilt Elastic rules (editing prebuilt rules is not supported)`
  );
};

export const checkMachineLearningRulesCannotBeModified = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_BODY).contains(
    `${rulesCount} custom machine learning rule (these rules don't have index patterns)`
  );
};

export const checkEsqlRulesCannotBeModified = (rulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_BODY).contains(
    `${rulesCount} custom ES|QL rule (these rules don't have index patterns)`
  );
};

export const waitForMixedRulesBulkEditModal = (customRulesCount: number) => {
  cy.get(MODAL_CONFIRMATION_TITLE).should(
    'have.text',
    `This action can only be applied to ${customRulesCount} custom rules`
  );
};

// SCHEDULE MANUAL RULE RUN
export const scheduleManualRuleRunForSelectedRules = (
  enabledCount: number,
  disabledCount: number
) => {
  cy.log('Bulk schedule manual rule run for selected rules');
  cy.get(BULK_ACTIONS_BTN).click();
  cy.get(BULK_MANUAL_RULE_RUN_BTN).click();
  if (disabledCount > 0) {
    cy.get(BULK_MANUAL_RULE_RUN_WARNING_MODAL).should(
      'have.text',
      `This action can only be applied to ${enabledCount} custom rulesThis action can't be applied to the following rules in your selection:${disabledCount} rules (Cannot schedule manual rule run for disabled rules)CancelSchedule ${enabledCount} custom rules`
    );
    cy.get(CONFIRM_MANUAL_RULE_RUN_WARNING_BTN).click();
  }
  cy.get(MODAL_CONFIRMATION_BTN).click();
};
