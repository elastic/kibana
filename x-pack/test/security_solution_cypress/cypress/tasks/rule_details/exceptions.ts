/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN,
  ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER,
  EXCEPTION_ITEM_VIEWER_SEARCH,
  FIELD_INPUT,
} from '../../screens/exceptions';
import {
  EDIT_EXCEPTION_BTN,
  ENDPOINT_EXCEPTIONS_TAB,
  EXCEPTIONS_TAB,
  EXCEPTIONS_TAB_ACTIVE_FILTER,
  EXCEPTIONS_TAB_EXPIRED_FILTER,
  EXCEPTION_ITEM_ACTIONS_BUTTON,
  REMOVE_EXCEPTION_BTN,
} from '../../screens/rule_details';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from '../exceptions';
import type { Exception } from '../../objects/exception';

export const goToExceptionsTab = () => {
  cy.get(EXCEPTIONS_TAB).click();
};

export const viewExpiredExceptionItems = () => {
  cy.get(EXCEPTIONS_TAB_EXPIRED_FILTER).click();
  cy.get(EXCEPTIONS_TAB_ACTIVE_FILTER).click();
};

export const goToEndpointExceptionsTab = () => {
  cy.get(ENDPOINT_EXCEPTIONS_TAB).click();
};

export const openEditException = (index = 0) => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).eq(index).click();
  cy.get(EDIT_EXCEPTION_BTN).eq(index).click();
};

export const removeException = () => {
  cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).click();

  cy.get(REMOVE_EXCEPTION_BTN).click();
};

export const openExceptionFlyoutFromEmptyViewerPrompt = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const searchForExceptionItem = (query: string) => {
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).clear();
  cy.get(EXCEPTION_ITEM_VIEWER_SEARCH).type(`${query}{enter}`);
};

export const addExceptionFlyoutFromViewerHeader = () => {
  cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).click();
  cy.get(FIELD_INPUT).should('be.visible');
};

export const addExceptionFromRuleDetails = (exception: Exception) => {
  addExceptionFlyoutFromViewerHeader();
  addExceptionConditions(exception);
  submitNewExceptionItem();
};

export const addFirstExceptionFromRuleDetails = (exception: Exception, name: string) => {
  openExceptionFlyoutFromEmptyViewerPrompt();
  addExceptionFlyoutItemName(name);
  addExceptionConditions(exception);
  selectBulkCloseAlerts();
  submitNewExceptionItem();
};
