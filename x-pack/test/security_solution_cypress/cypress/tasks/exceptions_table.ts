/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INPUT_FILE, TOASTER, TOASTER_BODY } from '../screens/alerts_detection_rules';
import {
  EXCEPTIONS_TABLE,
  EXCEPTIONS_TABLE_SEARCH,
  EXCEPTIONS_TABLE_DELETE_BTN,
  EXCEPTIONS_TABLE_SEARCH_CLEAR,
  EXCEPTIONS_TABLE_MODAL,
  EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN,
  EXCEPTIONS_TABLE_EXPORT_MODAL_BTN,
  EXCEPTIONS_OVERFLOW_ACTIONS_BTN,
  EXCEPTIONS_TABLE_EXPIRED_EXCEPTION_ITEMS_MODAL_CONFIRM_BTN,
  MANAGE_EXCEPTION_CREATE_BUTTON_MENU,
  MANAGE_EXCEPTION_CREATE_LIST_BUTTON,
  CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT,
  CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT,
  CREATE_SHARED_EXCEPTION_LIST_BTN,
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_NAME_BTN,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT,
  EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT,
  EXCEPTIONS_LIST_EDIT_DETAILS_SAVE_BTN,
  EXCEPTIONS_LIST_DETAILS_HEADER,
  EXCEPTIONS_TABLE_DUPLICATE_BTN,
  EXCEPTIONS_TABLE_LIST_NAME,
  INCLUDE_EXPIRED_EXCEPTION_ITEMS_SWITCH,
  EXCEPTION_LIST_DETAILS_CARD_ITEM_NAME,
  exceptionsTableListManagementListContainerByListId,
  EXCEPTIONS_TABLE_LINK_RULES_BTN,
  RULE_ACTION_LINK_RULE_SWITCH,
  LINKED_RULES_BADGE,
  MANAGE_RULES_SAVE,
  IMPORT_SHARED_EXCEPTION_LISTS_BTN,
  IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN,
  EXCEPTION_LIST_DETAIL_LINKED_TO_RULES_HEADER_MENU,
  EXCEPTION_LIST_DETAIL_LINKED_TO_RULES_HEADER_MENU_ITEM,
  MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION,
  IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_CREATE_NEW_CHECKBOX,
  IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_EXISTING_CHECKBOX,
} from '../screens/exceptions';
import { closeErrorToast } from './alerts_detection_rules';
import { assertExceptionItemsExists } from './exceptions';

export const clearSearchSelection = () => {
  cy.get(EXCEPTIONS_TABLE_SEARCH_CLEAR).first().click();
};

export const expandExceptionActions = () => {
  cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().click();
};

export const importExceptionLists = (listsFile: string) => {
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_BTN).click();
  cy.get(INPUT_FILE).should('exist');
  cy.get(INPUT_FILE).trigger('click');
  cy.get(INPUT_FILE).selectFile(listsFile);
  cy.get(INPUT_FILE).trigger('change');
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN).click();
};

export const exportExceptionList = (listId: string) => {
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(EXCEPTIONS_OVERFLOW_ACTIONS_BTN)
    .click();
  cy.get(EXCEPTIONS_TABLE_EXPORT_MODAL_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_EXPIRED_EXCEPTION_ITEMS_MODAL_CONFIRM_BTN).first().click();
};

export const assertNumberLinkedRules = (listId: string, numberOfRulesAsString: string) => {
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(LINKED_RULES_BADGE)
    .contains(numberOfRulesAsString);
};

export const linkRulesToExceptionList = (listId: string, ruleSwitch: number = 0) => {
  cy.log(`Open link rules flyout for list_id: '${listId}'`);
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(EXCEPTIONS_OVERFLOW_ACTIONS_BTN)
    .click();
  cy.get(EXCEPTIONS_TABLE_LINK_RULES_BTN).first().click();
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).eq(ruleSwitch).find('button').click();
  saveLinkedRules();
};

export const deleteExceptionListWithoutRuleReferenceByListId = (listId: string) => {
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(EXCEPTIONS_OVERFLOW_ACTIONS_BTN)
    .click();
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const deleteExceptionListWithRuleReferenceByListId = (listId: string) => {
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(EXCEPTIONS_OVERFLOW_ACTIONS_BTN)
    .click();
  cy.get(EXCEPTIONS_TABLE_DELETE_BTN).last().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  cy.get(EXCEPTIONS_TABLE_MODAL_CONFIRM_BTN).first().click();
  cy.get(EXCEPTIONS_TABLE_MODAL).should('not.exist');
};

export const searchForExceptionList = (searchText: string) => {
  if (Cypress.browser.name === 'firefox') {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(`${searchText}{enter}`, { force: true });
  } else {
    cy.get(EXCEPTIONS_TABLE_SEARCH).type(searchText, { force: true });
    cy.get(EXCEPTIONS_TABLE_SEARCH).trigger('search');
  }
};

export const waitForExceptionsTableToBeLoaded = () => {
  cy.get(EXCEPTIONS_TABLE).should('exist');
  cy.get(EXCEPTIONS_TABLE_SEARCH).should('exist');
};

export const createSharedExceptionList = (
  { name, description }: { name: string; description?: string },
  submit: boolean
) => {
  cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).first().click();
  cy.get(MANAGE_EXCEPTION_CREATE_LIST_BUTTON).first().click();

  cy.get(CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT).type(`${name}`);
  cy.get(CREATE_SHARED_EXCEPTION_LIST_NAME_INPUT).should('have.value', name);

  if (description != null) {
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).should('not.have.value');
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).type(`${description}`);
    cy.get(CREATE_SHARED_EXCEPTION_LIST_DESCRIPTION_INPUT).should('have.value', description);
  }

  if (submit) {
    cy.get(CREATE_SHARED_EXCEPTION_LIST_BTN).first().click();
  }
};

export const expectToContainList = (listName: string) => {
  cy.log(`Expecting exception lists table to contain '${listName}'`);
  cy.get(EXCEPTIONS_TABLE_LIST_NAME).should('include.text', listName);
};

export const assertExceptionListsExists = (listNames: string[]) => {
  for (const listName of listNames) {
    expectToContainList(listName);
  }
};

export const duplicateSharedExceptionListFromListsManagementPageByListId = (
  listId: string,
  includeExpired: boolean
) => {
  cy.log(`Duplicating list with list_id: '${listId}'`);
  cy.get(exceptionsTableListManagementListContainerByListId(listId))
    .find(EXCEPTIONS_OVERFLOW_ACTIONS_BTN)
    .click();
  cy.get(EXCEPTIONS_TABLE_DUPLICATE_BTN).first().click();
  if (!includeExpired) {
    cy.get(INCLUDE_EXPIRED_EXCEPTION_ITEMS_SWITCH).first().click();
  }
  cy.get(EXCEPTIONS_TABLE_EXPIRED_EXCEPTION_ITEMS_MODAL_CONFIRM_BTN).first().click();
};

export const waitForExceptionListDetailToBeLoaded = () => {
  cy.get(EXCEPTIONS_LIST_DETAILS_HEADER).should('exist');
};

export const findSharedExceptionListItemsByName = (listName: string, itemNames: string[]) => {
  cy.contains(listName).click();
  waitForExceptionListDetailToBeLoaded();
  assertExceptionItemsExists(EXCEPTION_LIST_DETAILS_CARD_ITEM_NAME, itemNames);
};

export const editExceptionLisDetails = ({
  name,
  description,
}: {
  name?: { original: string; updated: string };
  description?: { original: string; updated: string | null };
}) => {
  cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('exist');
  cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_NAME_BTN).first().click();

  if (name != null) {
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', name.original);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT)
      .should('have.value', name.original)
      .clear({ force: true });
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT).type(`${name.updated}`);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_NAME_INPUT).should('have.value', name.updated);
  }

  if (description != null) {
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT)
      .should('have.value', description.original)
      .clear({ force: true });
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT).should('not.have.value');
    if (description.updated != null) {
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT).type(
        `${description.updated}`
      );
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_EDIT_MODAL_DESCRIPTION_INPUT).should(
        'have.value',
        description.updated
      );
    }
  }

  cy.get(EXCEPTIONS_LIST_EDIT_DETAILS_SAVE_BTN).first().click();
};

export const clickOnLinkRulesByRuleRowOrderInListDetail = (ruleSwitch: number = 0) => {
  cy.get(RULE_ACTION_LINK_RULE_SWITCH).eq(ruleSwitch).find('button').click();
};
export const linkSharedListToRulesFromListDetails = (numberOfRules: number) => {
  for (let i = 0; i < numberOfRules; i++) {
    clickOnLinkRulesByRuleRowOrderInListDetail(i);
  }
};

export const saveLinkedRules = () => {
  cy.get(MANAGE_RULES_SAVE).first().click();
};

export const validateSharedListLinkedRules = (
  numberOfRules: number,
  linkedRulesNames: string[]
) => {
  cy.get(EXCEPTION_LIST_DETAIL_LINKED_TO_RULES_HEADER_MENU).should(
    'have.text',
    `Linked to ${numberOfRules} rules`
  );
  cy.get(EXCEPTION_LIST_DETAIL_LINKED_TO_RULES_HEADER_MENU).click();
  linkedRulesNames.forEach((ruleName) => {
    cy.get(EXCEPTION_LIST_DETAIL_LINKED_TO_RULES_HEADER_MENU_ITEM).contains('a', ruleName);
  });
};

export const addExceptionListFromSharedExceptionListHeaderMenu = () => {
  // Click on "Create shared exception list" button on the header
  cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_MENU).click();
  // Click on "Create exception item"
  cy.get(MANAGE_EXCEPTION_CREATE_BUTTON_EXCEPTION).click();
};

export const importExceptionListWithSelectingOverwriteExistingOption = () => {
  // { force: true }: The EuiCheckbox component's label covers the checkbox
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_EXISTING_CHECKBOX).check({ force: true });
  // Close the Error toast to be able to import again
  closeErrorToast();

  // Import after selecting overwrite option
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN).click();
};

export const importExceptionListWithSelectingCreateNewOption = () => {
  // { force: true }: The EuiCheckbox component's label covers the checkbox
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_OVERWRITE_CREATE_NEW_CHECKBOX).check({ force: true });
  // Close the Error toast to be able to import again
  closeErrorToast();

  // Import after selecting overwrite option
  cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CONFIRM_BTN).click();
};

export const validateImportExceptionListWentSuccessfully = () => {
  cy.wait('@import').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
    cy.get(TOASTER).should('have.text', `Exception list imported`);
  });
};
export const validateImportExceptionListFailedBecauseExistingListFound = () => {
  cy.wait('@import').then(({ response }) => {
    cy.wrap(response?.statusCode).should('eql', 200);
    cy.get(TOASTER).should('have.text', 'There was an error uploading the exception list.');
    cy.get(TOASTER_BODY).should('contain', 'Found that list_id');
  });
};
