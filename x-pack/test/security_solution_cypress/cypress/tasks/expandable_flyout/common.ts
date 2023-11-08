/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXPAND_ALERT_BTN } from '../../screens/alerts';
import { DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE } from '../../screens/expandable_flyout/alert_details_right_panel';
import {
  CREATE_CASE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT,
  DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT,
  KIBANA_NAVBAR_ALERTS_PAGE,
  KIBANA_NAVBAR_CASES_PAGE,
  NEW_CASE_CREATE_BUTTON,
  NEW_CASE_DESCRIPTION_INPUT,
  NEW_CASE_NAME_INPUT,
  VIEW_CASE_TOASTER_LINK,
} from '../../screens/expandable_flyout/common';
import { openTakeActionButtonAndSelectItem } from './alert_details_right_panel';

/**
 * Navigates to the alerts page by clicking on the Kibana sidenav entry
 */
export const navigateToAlertsPage = () => {
  cy.get(KIBANA_NAVBAR_ALERTS_PAGE).should('be.visible').click();
};

/**
 * Navigates to the cases page by clicking on the Kibana sidenav entry
 */
export const navigateToCasesPage = () => {
  cy.get(KIBANA_NAVBAR_CASES_PAGE).click();
};

/**
 * Find the first alert row in the alerts table then click on the expand icon button to open the flyout
 */
export const expandFirstAlertExpandableFlyout = () => {
  cy.get(EXPAND_ALERT_BTN).first().click();
};

/**
 * Create a new case from the cases page
 */
export const createNewCaseFromCases = () => {
  cy.get(CREATE_CASE_BUTTON).should('be.visible').click();
  cy.get(NEW_CASE_NAME_INPUT).should('be.visible').click();
  cy.get(NEW_CASE_NAME_INPUT).type('case');
  cy.get(NEW_CASE_DESCRIPTION_INPUT).should('be.visible').click();
  cy.get(NEW_CASE_DESCRIPTION_INPUT).type('case description');
  cy.get(NEW_CASE_CREATE_BUTTON).should('be.visible').click();
};

/**
 * create a new case from the expanded expandable flyout
 */
export const createNewCaseFromExpandableFlyout = () => {
  openTakeActionButtonAndSelectItem(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE);
  cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT).type('case');
  cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT).type('case description');
  cy.get(DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON).click();

  // NOTE: wait for case link (case created)
  cy.get(VIEW_CASE_TOASTER_LINK).should('be.visible');
};
