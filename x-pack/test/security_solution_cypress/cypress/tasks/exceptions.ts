/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Exception } from '../objects/exception';
import {
  FIELD_INPUT,
  OPERATOR_INPUT,
  CANCEL_BTN,
  EXCEPTION_ITEM_CONTAINER,
  EXCEPTION_FLYOUT_TITLE,
  VALUES_INPUT,
  VALUES_MATCH_ANY_INPUT,
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  EXCEPTION_ITEM_NAME_INPUT,
  CLOSE_SINGLE_ALERT_CHECKBOX,
  ADD_TO_RULE_RADIO_LABEL,
  ADD_TO_SHARED_LIST_RADIO_LABEL,
  SHARED_LIST_SWITCH,
  OS_SELECTION_SECTION,
  OS_INPUT,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_ICON,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_ACCORDION_ICON,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_DESCRIPTION,
  EXCEPTION_COMMENT_TEXT_AREA,
  EXCEPTION_COMMENTS_ACCORDION_BTN,
  EXCEPTION_ITEM_VIEWER_CONTAINER_SHOW_COMMENTS_BTN,
  EXCEPTION_ITEM_COMMENTS_CONTAINER,
  EXCEPTION_ITEM_COMMENT_COPY_BTN,
  VALUES_MATCH_INCLUDED_INPUT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_CARD_ITEM_AFFECTED_RULES,
  EXCEPTION_CARD_ITEM_AFFECTED_RULES_MENU_ITEM,
  ADD_AND_BTN,
  ADD_OR_BTN,
  RULE_ACTION_LINK_RULE_SWITCH,
  LINK_TO_SHARED_LIST_RADIO,
  EXCEPTION_ITEM_HEADER_ACTION_MENU,
  EXCEPTION_ITEM_OVERFLOW_ACTION_EDIT,
  EXCEPTION_ITEM_OVERFLOW_ACTION_DELETE,
} from '../screens/exceptions';

export const assertNumberOfExceptionItemsExists = (numberOfItems: number) => {
  cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', numberOfItems);
};

export const expectToContainItem = (container: string, itemName: string) => {
  cy.log(`Expecting exception items table to contain '${itemName}'`);
  cy.get(container).should('include.text', itemName);
};

export const assertExceptionItemsExists = (container: string, itemNames: string[]) => {
  for (const itemName of itemNames) {
    expectToContainItem(container, itemName);
  }
};

export const addExceptionEntryFieldValueOfItemX = (
  field: string,
  itemIndex = 0,
  fieldIndex = 0
) => {
  cy.get(EXCEPTION_ITEM_CONTAINER)
    .eq(itemIndex)
    .find(FIELD_INPUT)
    .eq(fieldIndex)
    .type(`${field}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const searchExceptionEntryFieldWithPrefix = (fieldPrefix: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).click({ force: true });
  cy.get(FIELD_INPUT).eq(index).type(fieldPrefix);
};

export const showFieldConflictsWarningTooltipWithMessage = (message: string, index = 0) => {
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_ICON).eq(index).realHover();
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP).should('be.visible');
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP).should('have.text', message);
};

export const showMappingConflictsWarningMessage = (message: string, index = 0) => {
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_ACCORDION_ICON).eq(index).click({ force: true });
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_DESCRIPTION).eq(index).should('have.text', message);
};

export const selectCurrentEntryField = (index = 0) => {
  cy.get(FIELD_INPUT).eq(index).type(`{downarrow}{enter}`);
};

export const addExceptionEntryFieldValue = (field: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).type(`${field}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldValueAndSelectSuggestion = (field: string, index = 0) => {
  cy.get(FIELD_INPUT).eq(index).type(`${field}`);
  cy.get(`button[title="${field}"]`).click();
};

export const addExceptionEntryOperatorValue = (operator: string, index = 0) => {
  cy.get(OPERATOR_INPUT).eq(index).type(`${operator}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldValueValue = (value: string, index = 0) => {
  cy.get(VALUES_INPUT).eq(index).type(`${value}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const addExceptionEntryFieldMatchAnyValue = (value: string, index = 0) => {
  cy.get(VALUES_MATCH_ANY_INPUT).eq(index).type(`${value}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};
export const addExceptionEntryFieldMatchIncludedValue = (value: string, index = 0) => {
  cy.get(VALUES_MATCH_INCLUDED_INPUT).eq(index).type(`${value}{enter}`);
  cy.get(EXCEPTION_FLYOUT_TITLE).click();
};

export const closeExceptionBuilderFlyout = () => {
  cy.get(CANCEL_BTN).click();
};

export const editException = (updatedField: string, itemIndex = 0, fieldIndex = 0) => {
  addExceptionEntryFieldValueOfItemX(`${updatedField}{downarrow}{enter}`, itemIndex, fieldIndex);
  addExceptionEntryFieldValueValue('foo', itemIndex);
};

export const addExceptionFlyoutItemName = (name: string) => {
  // waitUntil reduces the flakiness of this task because sometimes
  // there are background process/events happening which prevents cypress
  // to completely write the name of the exception before it page re-renders
  // thereby cypress losing the focus on the input element.
  cy.waitUntil(() => cy.get(EXCEPTION_ITEM_NAME_INPUT).then(($el) => Cypress.dom.isAttached($el)));
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('exist');
  cy.get(EXCEPTION_ITEM_NAME_INPUT).scrollIntoView();
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('be.visible');
  cy.get(EXCEPTION_ITEM_NAME_INPUT).first().focus();
  cy.get(EXCEPTION_ITEM_NAME_INPUT).type(`${name}{enter}`, { force: true });
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('have.value', name);
};

export const editExceptionFlyoutItemName = (name: string) => {
  cy.get(EXCEPTION_ITEM_NAME_INPUT).clear();
  cy.get(EXCEPTION_ITEM_NAME_INPUT).type(`${name}{enter}`);
  cy.get(EXCEPTION_ITEM_NAME_INPUT).should('have.value', name);
};

export const selectBulkCloseAlerts = () => {
  cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
};

export const selectCloseSingleAlerts = () => {
  cy.get(CLOSE_SINGLE_ALERT_CHECKBOX).click({ force: true });
};

export const addExceptionConditions = (exception: Exception) => {
  cy.get(FIELD_INPUT).type(`${exception.field}{downArrow}{enter}`);
  cy.get(OPERATOR_INPUT).type(`${exception.operator}{enter}`);
  exception.values.forEach((value) => {
    cy.get(VALUES_INPUT).type(`${value}{enter}`);
  });
};

export const validateExceptionConditionField = (value: string) => {
  cy.get(EXCEPTION_ITEM_CONTAINER).contains('span', value);
};
export const validateEmptyExceptionConditionField = () => {
  cy.get(FIELD_INPUT).should('be.empty');
};
export const submitNewExceptionItem = () => {
  cy.get(CONFIRM_BTN).should('exist');
  cy.get(CONFIRM_BTN).click();
  cy.get(CONFIRM_BTN).should('not.exist');
};

export const submitEditedExceptionItem = () => {
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
};

export const selectAddToRuleRadio = () => {
  cy.get(ADD_TO_RULE_RADIO_LABEL).click();
};

export const selectSharedListToAddExceptionTo = (numListsToCheck = 1) => {
  cy.get(ADD_TO_SHARED_LIST_RADIO_LABEL).click();
  for (let i = 0; i < numListsToCheck; i++) {
    cy.get(SHARED_LIST_SWITCH).eq(i).click();
  }
};

export const selectOs = (os: string) => {
  cy.get(OS_SELECTION_SECTION).should('exist');
  cy.get(OS_INPUT).type(`${os}{downArrow}{enter}`);
};

export const addExceptionComment = (comment: string) => {
  cy.get(EXCEPTION_COMMENTS_ACCORDION_BTN).click();
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).type(`${comment}`);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).should('have.value', comment);
};

export const validateExceptionCommentCountAndText = (count: number, comment: string) => {
  cy.get(EXCEPTION_COMMENTS_ACCORDION_BTN).contains('h3', count);
  cy.get(EXCEPTION_COMMENT_TEXT_AREA).contains('textarea', comment);
};
export const clickOnShowComments = () => {
  cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER_SHOW_COMMENTS_BTN).click();
};

export const clickCopyCommentToClipboard = () => {
  // Disable window prompt which is used in link creation by copy-to-clipboard library
  // as this prompt pauses test execution during `cypress open`
  cy.window().then((win) => {
    cy.stub(win, 'prompt').returns('DISABLED WINDOW PROMPT');
  });
  cy.get(EXCEPTION_ITEM_COMMENTS_CONTAINER).first().find(EXCEPTION_ITEM_COMMENT_COPY_BTN).click();
};

export const validateExceptionItemAffectsTheCorrectRulesInRulePage = (rulesCount: number) => {
  cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', rulesCount);
  cy.get(EXCEPTION_CARD_ITEM_AFFECTED_RULES).should('have.text', `Affects ${rulesCount} rule`);
};
export const validateExceptionItemFirstAffectedRuleNameInRulePage = (ruleName: string) => {
  cy.get(EXCEPTION_CARD_ITEM_AFFECTED_RULES).click();

  cy.get(EXCEPTION_CARD_ITEM_AFFECTED_RULES_MENU_ITEM).first().should('have.text', ruleName);
};

export const addTwoAndedConditions = (
  firstEntryField: string,
  firstEntryFieldValue: string,
  secondEntryField: string,
  secondEntryFieldValue: string
) => {
  addExceptionEntryFieldValue(firstEntryField, 0);
  addExceptionEntryFieldValueValue(firstEntryFieldValue, 0);

  cy.get(ADD_AND_BTN).click();

  addExceptionEntryFieldValue(secondEntryField, 1);
  addExceptionEntryFieldValueValue(secondEntryFieldValue, 1);
};

export const addTwoORedConditions = (
  firstEntryField: string,
  firstEntryFieldValue: string,
  secondEntryField: string,
  secondEntryFieldValue: string
) => {
  addExceptionEntryFieldValue(firstEntryField, 0);
  addExceptionEntryFieldValueValue(firstEntryFieldValue, 0);

  cy.get(ADD_OR_BTN).click();

  addExceptionEntryFieldValue(secondEntryField, 1);
  addExceptionEntryFieldValueValue(secondEntryFieldValue, 1);
};

export const linkFirstRuleOnExceptionFlyout = () => {
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();
};

export const linkFirstSharedListOnExceptionFlyout = () => {
  cy.get(LINK_TO_SHARED_LIST_RADIO).click();
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).find('button').click();
};

export const editFirstExceptionItemInListDetailPage = () => {
  // Click on the first exception overflow menu items
  cy.get(EXCEPTION_ITEM_HEADER_ACTION_MENU).click();

  // Open the edit modal
  cy.get(EXCEPTION_ITEM_OVERFLOW_ACTION_EDIT).click();
};
export const deleteFirstExceptionItemInListDetailPage = () => {
  // Click on the first exception overflow menu items
  cy.get(EXCEPTION_ITEM_HEADER_ACTION_MENU).click();

  // Delete exception
  cy.get(EXCEPTION_ITEM_OVERFLOW_ACTION_DELETE).click();
};
export const validateHighlightedFieldsPopulatedAsExceptionConditions = (
  highlightedFields: string[]
) => {
  return highlightedFields.every((field) => validateExceptionConditionField(field));
};
