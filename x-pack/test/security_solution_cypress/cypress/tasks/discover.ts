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
  DISCOVER_QUERY_INPUT,
  GET_DISCOVER_COLUMN_TOGGLE_BTN,
  DISCOVER_FIELD_SEARCH,
  DISCOVER_DATA_VIEW_EDITOR_FLYOUT,
  DISCOVER_FIELD_LIST_LOADING,
} from '../screens/discover';
import { GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON } from '../screens/search_bar';

export const switchDataViewTo = (dataviewName: string) => {
  openDataViewSwitcher();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.GET_DATA_VIEW(dataviewName)).trigger('click');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.INPUT).should('not.be.visible');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', dataviewName);
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

export const addDiscoverKqlQuery = (kqlQuery: string) => {
  cy.get(DISCOVER_QUERY_INPUT).type(kqlQuery);
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
