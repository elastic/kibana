/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_BY_RISK_TABLE_FILTER,
  HOST_BY_RISK_TABLE_FILTER_CRITICAL,
  HOST_BY_RISK_TABLE_FILTER_LOW,
  HOST_BY_RISK_TABLE_PERPAGE_BUTTON,
  HOST_BY_RISK_TABLE_PERPAGE_OPTIONS,
  LOADING_SPINNER,
  RISK_DETAILS_NAV,
} from '../screens/hosts/host_risk';

export const navigateToHostRiskDetailTab = (attempts = 3) => {
  // this was causing flakiness
  // on very rare occasions the tab is not navigated to, so we now retry
  if (attempts === 0) {
    throw new Error('navigateToHostRiskDetailTab failed after 3 attempts');
  }
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(RISK_DETAILS_NAV).click();
  cy.get(LOADING_SPINNER).should('not.exist');
  cy.get(RISK_DETAILS_NAV).then(($tab) => {
    if ($tab.hasClass('euiTab-isSelected')) {
      return;
    } else if (attempts > 0) {
      navigateToHostRiskDetailTab(attempts - 1);
    }
  });
};

export const openRiskTableFilterAndSelectTheCriticalOption = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER).first().click();
  cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();
};

export const openRiskTableFilterAndSelectTheLowOption = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER).first().click();
  cy.get(HOST_BY_RISK_TABLE_FILTER_LOW).click();
};

export const removeLowFilterAndCloseRiskTableFilter = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER_LOW).click();
  cy.get(HOST_BY_RISK_TABLE_FILTER).first().click();
};

export const removeCriticalFilterAndCloseRiskTableFilter = () => {
  cy.get(HOST_BY_RISK_TABLE_FILTER_CRITICAL).click();
  cy.get(HOST_BY_RISK_TABLE_FILTER).first().click();
};

export const selectFiveItemsPerPageOption = () => {
  cy.get(HOST_BY_RISK_TABLE_PERPAGE_BUTTON).click();
  cy.get(HOST_BY_RISK_TABLE_PERPAGE_OPTIONS).first().click();
};
