/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_INPUT,
  GET_DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  GET_DATE_PICKER_END_DATE_POPOVER_BUTTON,
  GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_NOW_TAB,
  DATE_PICKER_NOW_BUTTON,
  GET_LOCAL_DATE_PICKER_APPLY_BUTTON,
  GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON,
  GET_LOCAL_SHOW_DATES_BUTTON,
  GLOBAL_FILTERS_CONTAINER,
} from '../screens/date_picker';

export const setEndDateNow = (container: string = GLOBAL_FILTERS_CONTAINER) => {
  cy.get(GET_DATE_PICKER_END_DATE_POPOVER_BUTTON(container)).click();
  cy.get(DATE_PICKER_NOW_TAB).first().click();
  cy.get(DATE_PICKER_NOW_BUTTON).click();
};

export const setEndDate = (date: string, container: string = GLOBAL_FILTERS_CONTAINER) => {
  cy.get(GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON(container)).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click();
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const setStartDate = (date: string, container: string = GLOBAL_FILTERS_CONTAINER) => {
  cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(container)).first().click({});

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click();
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const updateDates = (container: string = GLOBAL_FILTERS_CONTAINER) => {
  cy.get(GET_DATE_PICKER_APPLY_BUTTON(container)).click({ force: true });
  cy.get(GET_DATE_PICKER_APPLY_BUTTON(container)).should('not.have.text', 'Updating');
};

export const updateTimelineDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).first().click();
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).first().should('not.have.text', 'Updating');
};

export const updateDateRangeInLocalDatePickers = (
  localQueryBarSelector: string,
  startDate: string,
  endDate: string
) => {
  cy.get(GET_LOCAL_SHOW_DATES_BUTTON(localQueryBarSelector)).click();
  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(`${startDate}{enter}`);
  cy.get(GET_LOCAL_DATE_PICKER_APPLY_BUTTON(localQueryBarSelector)).click();
  cy.get(GET_LOCAL_DATE_PICKER_APPLY_BUTTON(localQueryBarSelector)).should(
    'not.have.text',
    'Updating'
  );

  cy.get(GET_LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON(localQueryBarSelector)).click();

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click();

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(`${endDate}{enter}`);
  cy.get(GET_LOCAL_DATE_PICKER_APPLY_BUTTON(localQueryBarSelector)).click();
};

export const showStartEndDate = (container: string = GLOBAL_FILTERS_CONTAINER) => {
  cy.get(GET_LOCAL_SHOW_DATES_BUTTON(container)).click();
  cy.get(GET_LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON(container)).click();
};
