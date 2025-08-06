/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER } from '../screens/alerts_detection_rules';
import { KQL_INPUT, openNavigationPanelFor, REFRESH_BUTTON } from '../screens/security_header';
import { openNavigationPanelFor as openServerlessNavigationPanelFor } from '../screens/serverless_security_header';

export const clearSearchBar = () => {
  cy.get(KQL_INPUT).clear();
  cy.get(KQL_INPUT).realPress('Enter');
};

export const kqlSearch = (search: string) => {
  cy.get(KQL_INPUT).type(search, { force: true });
};

export const navigateFromHeaderTo = (page: string, isServerless: boolean = false) => {
  if (isServerless) {
    openServerlessNavigationPanelFor(page);
  } else {
    openNavigationPanelFor(page);
  }
  cy.get(page).click();
};

export const refreshPage = () => {
  cy.get(REFRESH_BUTTON).click({ force: true });
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
};

export const saveQuery = (name: string) => {
  const random = Math.floor(Math.random() * 100000);
  const queryName = `${name}-${random}`;
  cy.get('div[data-test-subj="globalDatePicker"] [data-test-subj="queryBarMenuPopover"]').click();
  cy.get('[data-test-subj="saved-query-management-save-button"]').click();
  cy.get('[data-test-subj="saveQueryFormTitle"]').type(queryName);
  cy.get('[data-test-subj="savedQueryFormSaveButton"]').click();
  cy.get(TOASTER).should('have.text', `Your query "${queryName}" was saved`);
  return queryName;
};
