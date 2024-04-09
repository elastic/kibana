/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import {
  VALUE_LISTS_MODAL_ACTIVATOR,
  VALUE_LIST_CLOSE_BUTTON,
  VALUE_LIST_DELETE_BUTTON,
  VALUE_LIST_EXPORT_BUTTON,
  VALUE_LIST_FILE_PICKER,
  VALUE_LIST_FILE_UPLOAD_BUTTON,
  VALUE_LIST_TYPE_SELECTOR,
  VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT,
  VALUE_LIST_ITEMS_MODAL_TABLE,
  VALUE_LIST_ITEMS_MODAL_INFO,
  VALUE_LIST_ITEMS_ADD_BUTTON_SHOW_POPOVER,
  VALUE_LIST_ITEMS_ADD_INPUT,
  VALUE_LIST_ITEMS_ADD_BUTTON_SUBMIT,
  VALUE_LIST_ITEMS_FILE_PICKER,
  VALUE_LIST_ITEMS_UPLOAD,
  getValueListUpdateItemButton,
  getValueListDeleteItemButton,
} from '../screens/lists';
import { EUI_INLINE_SAVE_BUTTON } from '../screens/common/controls';
import { rootRequest } from './api_calls/common';

export const KNOWN_VALUE_LIST_FILES = {
  TEXT: 'value_list.txt',
  IPs: 'ip_list.txt',
  CIDRs: 'cidr_list.txt',
};

export const createListsIndex = () => {
  rootRequest({
    method: 'POST',
    url: '/api/lists/index',
    failOnStatusCode: false,
  });
};

export const waitForListsIndex = () => {
  rootRequest({
    url: '/api/lists/index',
    retryOnStatusCodeFailure: true,
  }).then((response) => {
    if (response.status !== 200) {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(7500);
    }
  });
};

export const waitForValueListsModalToBeLoaded = () => {
  cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('exist');
  cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('not.be.disabled');
};

export const openValueListsModal = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LISTS_MODAL_ACTIVATOR).click({ force: true });
};

export const closeValueListsModal = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_CLOSE_BUTTON).click({ force: true });
};

export const selectValueListsFile = (file: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_FILE_PICKER).attachFile(file).trigger('change', { force: true });
};

export const deleteValueListsFile = (file: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_DELETE_BUTTON(file)).click();
};

export const selectValueListType = (type: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_TYPE_SELECTOR).select(type);
};

export const uploadValueList = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_FILE_UPLOAD_BUTTON).click();
};

export const exportValueList = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_EXPORT_BUTTON).click();
};

/**
 * Given an array of value lists this will delete them all using Cypress Request and the lists REST API
 *
 * If a list doesn't exist it ignores the error.
 *
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
export const deleteValueLists = (
  lists: string[]
): Array<Cypress.Chainable<Cypress.Response<unknown>>> => {
  return lists.map((list) => deleteValueList(list));
};

/**
 * Given a single value list this will delete it using Cypress Request and lists REST API
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
const deleteValueList = (list: string): Cypress.Chainable<Cypress.Response<unknown>> => {
  return rootRequest({
    method: 'DELETE',
    url: `api/lists?id=${list}`,
    failOnStatusCode: false,
  });
};

/**
 * Uploads list items using Cypress Request and lists REST API.
 *
 * This also will remove any upload data such as empty strings that can happen from the fixture
 * due to extra lines being added from formatters such as prettier.
 * @param file The file name to import
 * @param type The type of the file import such as ip/keyword/text etc...
 * @param data The contents of the file
 * @param testSuggestions The type of test to use rather than the fixture file which is useful for ranges
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
const uploadListItemData = (
  file: string,
  type: string,
  data: string
): Cypress.Chainable<Cypress.Response<unknown>> => {
  const removedEmptyLines = data
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');

  return rootRequest({
    method: 'POST',
    url: `api/lists/items/_import?type=${type}&refresh=true`,
    encoding: 'binary',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryJLrRH89J8QVArZyv',
    },
    body: `------WebKitFormBoundaryJLrRH89J8QVArZyv\nContent-Disposition: form-data; name="file"; filename="${file}"\n\n${removedEmptyLines}`,
    retryOnStatusCodeFailure: true,
  });
};

/**
 * Imports a single value list file this using Cypress Request and lists REST API. After it
 * imports the data, it will re-check and ensure that the data is there before continuing to
 * get us more deterministic.
 *
 * You can optionally pass in an array of test suggestions which will be useful for if you are
 * using a range such as a CIDR range and need to ensure that test range has been added to the
 * list but you cannot run an explicit test against that range.
 *
 * This also will remove any upload data such as empty strings that can happen from the fixture
 * due to extra lines being added from formatters.
 * @param file The file to import
 * @param type The type of the file import such as ip/keyword/text etc...
 * @param testSuggestions The type of test to use rather than the fixture file which is useful for ranges
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
export const importValueList = (
  file: string,
  type: string,
  testSuggestions: string[] | undefined = undefined
) => {
  return cy.fixture<string>(file).then((data) => uploadListItemData(file, type, data));
};

export const openValueListItemsModal = (listId: string) => {
  return cy.get(`[data-test-subj="show-value-list-modal-${listId}"]`).click();
};

export const searchValueListItemsModal = (search: string) => {
  cy.get(VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT).clear();
  cy.get(VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT).type(search);
  return cy.get(VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT).trigger('search');
};

export const clearSearchValueListItemsModal = (search: string) => {
  cy.get(VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT).clear();
  return cy.get(VALUE_LIST_ITEMS_MODAL_SEARCH_BAR_INPUT).trigger('search');
};

export const getValueListItemsTableRow = () =>
  cy.get(VALUE_LIST_ITEMS_MODAL_TABLE).find('tbody tr');

export const checkTotalItems = (totalItems: number) => {
  cy.get(VALUE_LIST_ITEMS_MODAL_INFO).contains(`Total items: ${totalItems}`);
};

export const deleteListItem = (value: string) => {
  return cy.get(getValueListDeleteItemButton(value)).click();
};

export const sortByValue = () => {
  cy.get(VALUE_LIST_ITEMS_MODAL_TABLE).find('thead tr th').eq(0).click();
};

export const updateListItem = (oldValue: string, newValue: string) => {
  const inlineEdit = getValueListUpdateItemButton(oldValue);
  cy.get(inlineEdit).click();
  cy.get(inlineEdit).find('input').clear();
  cy.get(inlineEdit).find('input').type(newValue);
  return cy.get(inlineEdit).find(EUI_INLINE_SAVE_BUTTON).click();
};

export const addListItem = (value: string) => {
  cy.get(VALUE_LIST_ITEMS_ADD_BUTTON_SHOW_POPOVER).click();
  cy.get(VALUE_LIST_ITEMS_ADD_INPUT).type(value);
  return cy.get(VALUE_LIST_ITEMS_ADD_BUTTON_SUBMIT).click();
};

export const selectValueListsItemsFile = (file: string) => {
  return cy.get(VALUE_LIST_ITEMS_FILE_PICKER).attachFile(file).trigger('change');
};

export const uploadValueListsItemsFile = () => {
  return cy.get(VALUE_LIST_ITEMS_UPLOAD).click();
};

export const mockFetchListItemsError = () => {
  cy.intercept('GET', `${LIST_ITEM_URL}/_find*`, {
    statusCode: 400,
    body: {
      message: 'search_phase_execution_exception: all shards failed',
      status_code: 400,
    },
  });
};

export const mockCreateListItemError = () => {
  cy.intercept('POST', `${LIST_ITEM_URL}`, {
    statusCode: 400,
    body: {
      message: 'error to create list item',
      status_code: 400,
    },
  });
};

export const mockUpdateListItemError = () => {
  cy.intercept('PATCH', `${LIST_ITEM_URL}`, {
    statusCode: 400,
    body: {
      message: 'error to update list item',
      status_code: 400,
    },
  });
};

export const mockDeleteListItemError = () => {
  cy.intercept('DELETE', `${LIST_ITEM_URL}*`, {
    statusCode: 400,
    body: {
      message: 'error to delete list item',
      status_code: 400,
    },
  });
};
