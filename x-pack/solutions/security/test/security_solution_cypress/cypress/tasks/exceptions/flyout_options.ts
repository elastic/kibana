/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER_CLOSE_ICON } from '../../screens/alerts_detection_rules';
import {
  CANCEL_BTN,
  CLOSE_ALERTS_CHECKBOX,
  CLOSE_SINGLE_ALERT_CHECKBOX,
  CONFIRM_BTN,
  EXCEPTION_EDIT_FLYOUT_SAVE_BTN,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_ACCORDION_ICON,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_DESCRIPTION,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_ICON,
  EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP,
  EXCEPTION_ITEM_NAME_INPUT,
  OS_INPUT,
  OS_SELECTION_SECTION,
} from '../../screens/exceptions';
import { closeErrorToast } from '../alerts_detection_rules';

export const showFieldConflictsWarningTooltipWithMessage = (message: string, index = 0) => {
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_ICON).eq(index).realHover();
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP).should('be.visible');
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_TOOLTIP).should('have.text', message);
};

export const showMappingConflictsWarningMessage = (message: string, index = 0) => {
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_ACCORDION_ICON).eq(index).click({ force: true });
  cy.get(EXCEPTION_FIELD_MAPPING_CONFLICTS_DESCRIPTION).eq(index).should('have.text', message);
};

export const addExceptionFlyoutItemName = (
  name: string,
  selector: string = EXCEPTION_ITEM_NAME_INPUT
) => {
  // waitUntil reduces the flakiness of this task because sometimes
  // there are background process/events happening which prevents cypress
  // to completely write the name of the exception before it page re-renders
  // thereby cypress losing the focus on the input element.
  cy.waitUntil(() => cy.get(selector).then(($el) => Cypress.dom.isAttached($el)));
  cy.get(selector).should('exist');
  cy.get(selector).scrollIntoView();
  cy.get(selector).should('be.visible');
  cy.get(selector).first().focus();
  cy.get(selector).type(`{selectall}${name}{enter}`, { force: true });
  cy.get(selector).should('have.value', name);
};

export const editExceptionFlyoutItemName = (
  name: string,
  selector: string = EXCEPTION_ITEM_NAME_INPUT
) => {
  cy.get(selector).clear();
  cy.get(selector).type(`{selectall}${name}{enter}`);
  cy.get(selector).should('have.value', name);
};

export const selectBulkCloseAlerts = () => {
  cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
  cy.get(CLOSE_ALERTS_CHECKBOX).click({ force: true });
};

export const selectCloseSingleAlerts = () => {
  cy.get(CLOSE_SINGLE_ALERT_CHECKBOX).click({ force: true });
};

export const closeExceptionBuilderFlyout = () => {
  cy.get(CANCEL_BTN).click();
};

export const selectOs = (os: string) => {
  cy.get(OS_SELECTION_SECTION).should('exist');
  cy.get(OS_INPUT).type(`${os}{downArrow}{enter}`);
};

export const submitNewExceptionItem = (selector: string = CONFIRM_BTN) => {
  cy.get(selector).should('exist');
  /* Sometimes a toaster error message unrelated with the test performed is displayed.
   The toaster is blocking the confirm button we have to click. Using force true would solve the issue, but should not be used.
   There are some tests that use the closeErrorToast() method to close error toasters before continuing with the interactions with the page.
   In this case we check if a toaster is displayed and if so, close it to continue with the test.
   */
  cy.root().then(($page) => {
    const element = $page.find(TOASTER_CLOSE_ICON);
    if (element.length > 0) {
      closeErrorToast();
    }
  });
  cy.get(selector).click();
  cy.get(selector).should('not.exist');
};

export const submitEditedExceptionItem = () => {
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).click();
  cy.get(EXCEPTION_EDIT_FLYOUT_SAVE_BTN).should('not.exist');
};
