/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLYOUT_CLOSE_BUTTON,
  FLYOUT_TABS,
  TOGGLE_FLYOUT_BUTTON,
} from '../../screens/threat_intelligence/indicators';

/**
 * Close the opened flyout
 */
export const closeFlyout = () => {
  cy.get(FLYOUT_CLOSE_BUTTON).click();
};

/**
 * Open the indicator flyout from indicators table
 */
export const openFlyout = (index: number) => {
  cy.get(TOGGLE_FLYOUT_BUTTON).eq(index).click();
};

/**
 * Navigate to Table tab in indicators flyout
 */
export const navigateToFlyoutTableTab = () => {
  cy.get(`${FLYOUT_TABS} button:nth-child(2)`).click();
};

/**
 * Navigate to Json tab in indicators flyout
 */
export const navigateToFlyoutJsonTab = () => {
  cy.get(`${FLYOUT_TABS} button:nth-child(3)`).click();
};
