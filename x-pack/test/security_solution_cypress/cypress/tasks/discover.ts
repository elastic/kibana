/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DISCOVER_ADD_FILTER,
  DISCOVER_CONTAINER,
  DISCOVER_DATA_GRID_UPDATING,
  DISCOVER_DATA_VIEW_SWITCHER,
  DISCOVER_ESQL_INPUT,
  GET_DISCOVER_COLUMN_TOGGLE_BTN,
  DISCOVER_FIELD_SEARCH,
  DISCOVER_DATA_VIEW_EDITOR_FLYOUT,
  DISCOVER_FIELD_LIST_LOADING,
  DISCOVER_ESQL_EDITABLE_INPUT,
} from '../screens/discover';
import { GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON } from '../screens/search_bar';
import { gotToEsqlTab } from './timeline';

export const switchDataViewTo = (dataviewName: string) => {
  openDataViewSwitcher();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.GET_DATA_VIEW(dataviewName)).trigger('click');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.INPUT).should('not.exist');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', dataviewName);
};

export const switchDataViewToESQL = () => {
  openDataViewSwitcher();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.TEXT_BASE_LANG_SWICTHER).trigger('click');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', 'ES|QL');
};

export const openDataViewSwitcher = () => {
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).click();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.INPUT).should('be.visible');
};

export const waitForDiscoverGridToLoad = () => {
  cy.get(DISCOVER_DATA_GRID_UPDATING).should('be.visible');
  cy.get(DISCOVER_DATA_GRID_UPDATING).should('not.exist');
  cy.get(DISCOVER_FIELD_LIST_LOADING).should('be.visible');
  cy.get(DISCOVER_FIELD_LIST_LOADING).should('not.exist');
};

export const selectCurrentDiscoverEsqlQuery = (
  discoverEsqlInput = DISCOVER_ESQL_EDITABLE_INPUT
) => {
  gotToEsqlTab();
  cy.get(discoverEsqlInput).should('be.visible').click();
  cy.get(discoverEsqlInput).should('be.focused');
  cy.get(discoverEsqlInput).type(Cypress.platform === 'darwin' ? '{cmd+a}' : '{ctrl+a}');
};

export const addDiscoverEsqlQuery = (esqlQuery: string) => {
  // ESQL input uses the monaco editor which doesn't allow for traditional input updates
  selectCurrentDiscoverEsqlQuery(DISCOVER_ESQL_EDITABLE_INPUT);
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).clear();
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).type(`${esqlQuery}`);
  cy.get(DISCOVER_ESQL_EDITABLE_INPUT).blur();
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).realClick();
};

export const convertNBSPToSP = (str: string) => {
  return str.replaceAll(String.fromCharCode(160), ' ');
};

export const verifyDiscoverEsqlQuery = (esqlQueryToVerify: string) => {
  // We select the query first as multi-line queries do not render fully unless all the text is selected
  selectCurrentDiscoverEsqlQuery();
  /**
   * When selected all visual spaces actually render the middot character, so we replace the spaces with the middot
   * If testing without selecting first you can replace with a Non-breaking space character
   * https://github.com/cypress-io/cypress/issues/15863#issuecomment-816746693
   */
  const unicodeReplacedQuery = esqlQueryToVerify.replaceAll(' ', '\u00b7');
  cy.get(DISCOVER_ESQL_INPUT).should('include.text', unicodeReplacedQuery);
};

export const submitDiscoverSearchBar = () => {
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).trigger('click');
};

export const openAddDiscoverFilterPopover = () => {
  cy.log(DISCOVER_CONTAINER);
  cy.log(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER));
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).should('be.enabled');
  cy.get(DISCOVER_ADD_FILTER).should('be.visible');
  cy.get(DISCOVER_ADD_FILTER).click();
};

export const searchForField = (fieldId: string) => {
  cy.get(DISCOVER_FIELD_SEARCH).type(fieldId);
};

export const clearFieldSearch = () => {
  cy.get(DISCOVER_FIELD_SEARCH).clear();
};

export const addFieldToTable = (fieldId: string) => {
  searchForField(fieldId);
  cy.get(GET_DISCOVER_COLUMN_TOGGLE_BTN(fieldId)).first().should('exist');
  cy.get(GET_DISCOVER_COLUMN_TOGGLE_BTN(fieldId)).first().trigger('click');
  clearFieldSearch();
};

export const createAdHocDataView = (name: string, indexPattern: string, save: boolean = false) => {
  openDataViewSwitcher();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.CREATE_NEW).trigger('click');
  cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.MAIN).should('be.visible');
  cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.NAME_INPUT).type(name);
  cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.INDEX_PATTERN_INPUT).type(indexPattern);
  if (save) {
    cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.SAVE_DATA_VIEW_BTN).trigger('click');
  } else {
    cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.USE_WITHOUT_SAVING_BTN).trigger('click');
  }
  cy.get(DISCOVER_DATA_VIEW_EDITOR_FLYOUT.MAIN).should('not.exist');
};
