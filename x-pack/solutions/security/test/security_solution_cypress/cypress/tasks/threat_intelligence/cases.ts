/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATE_NEW_CASE_FROM_MODAL_BUTTON,
  FLYOUT_ADD_TO_CASE_ITEM,
  INDICATORS_TABLE_ADD_TO_CASE_ITEM,
  NEW_CASE_CREATE_BUTTON,
  NEW_CASE_DESCRIPTION_INPUT,
  NEW_CASE_NAME_INPUT,
  SELECT_CASE_TABLE_ROW,
  SELECT_EXISTING_CASE,
  SELECT_EXISTING_CASES_MODAL,
  VIEW_CASE_TOASTER_LINK,
} from '../../screens/threat_intelligence/cases';

/**
 * Open the new case flyout from the unified case modal in the indicators table
 */
export const openAddToNewCaseFlyoutFromTable = () => {
  cy.get(INDICATORS_TABLE_ADD_TO_CASE_ITEM).first().click();
  cy.get(CREATE_NEW_CASE_FROM_MODAL_BUTTON).click();
};

/**
 * Open the case selector from the indicators table more actions menu
 */
export const openAddToExistingCaseFlyoutFromTable = () => {
  cy.get(INDICATORS_TABLE_ADD_TO_CASE_ITEM).first().click();
};

/**
 * Open the new case flyout from the unified case modal in the indicator flyout
 */
export const openAddToNewCaseFromFlyout = () => {
  cy.get(FLYOUT_ADD_TO_CASE_ITEM).first().click();
  cy.get(CREATE_NEW_CASE_FROM_MODAL_BUTTON).click();
};

/**
 * Open the case selector from the indicator flyout take action menu
 */
export const openAddToExistingCaseFromFlyout = () => {
  cy.get(FLYOUT_ADD_TO_CASE_ITEM).first().click();
};

/**
 * Create a new case from the Threat Intelligence page
 */
export const createNewCaseFromTI = () => {
  cy.get(NEW_CASE_NAME_INPUT).type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).click();
};

/**
 * Click on the toaster to navigate to case and verified created case
 */
export const navigateToCaseViaToaster = () => {
  cy.get(VIEW_CASE_TOASTER_LINK).click();
};

/**
 * Select existing case from cases modal
 */
export const selectExistingCase = () => {
  cy.get(SELECT_EXISTING_CASES_MODAL).within(() => {
    cy.get(SELECT_CASE_TABLE_ROW).its('length').should('be.gte', 0);
    cy.get(SELECT_EXISTING_CASE).should('exist').contains('Select').click();
  });
};
