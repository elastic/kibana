/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELD_BROWSER_CLOSE_BTN,
  FIELDS_BROWSER_CHECKBOX,
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_VIEW_ALL,
  FIELDS_BROWSER_VIEW_BUTTON,
  FIELDS_BROWSER_VIEW_SELECTED,
  GET_FIELD_CHECKBOX,
} from '../screens/fields_browser';

export const addsFields = (fields: string[]) => {
  fields.forEach((field) => {
    cy.get(FIELDS_BROWSER_CHECKBOX(field)).click();
  });
};

export const clearFieldsBrowser = () => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{selectall}{backspace}');

  cy.waitUntil(() =>
    cy
      .get(FIELDS_BROWSER_FILTER_INPUT)
      .then((subject) => !subject.hasClass('euiFieldSearch-isLoading'))
  );
};

export const closeFieldsBrowser = () => {
  cy.get(FIELD_BROWSER_CLOSE_BTN).click();
  cy.get(FIELDS_BROWSER_FILTER_INPUT).should('not.exist');
};

export const filterFieldsBrowser = (fieldName: string) => {
  cy.get(FIELDS_BROWSER_FILTER_INPUT).clear();
  cy.get(FIELDS_BROWSER_FILTER_INPUT).type(fieldName);

  cy.waitUntil(() =>
    cy
      .get(FIELDS_BROWSER_FILTER_INPUT)
      .then((subject) => !subject.hasClass('euiFieldSearch-isLoading'))
  );
};

export const removeField = (fieldName: string) => {
  cy.get(GET_FIELD_CHECKBOX(fieldName)).uncheck();
};

export const activateViewSelected = () => {
  cy.get(FIELDS_BROWSER_VIEW_BUTTON).click();
  cy.get(FIELDS_BROWSER_VIEW_SELECTED).click();
};
export const activateViewAll = () => {
  cy.get(FIELDS_BROWSER_VIEW_BUTTON).click();
  cy.get(FIELDS_BROWSER_VIEW_ALL).click();
};
