/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_DETAILS_FLYOUT,
  TIMELINE_DETAILS_FLYOUT,
  TIMELINE_DETAILS_FLYOUT_BTN,
  USER_DETAILS_FLYOUT,
} from '../screens/unified_timeline';

export const openEventDetailsFlyout = (rowIndex: number) => {
  cy.get(TIMELINE_DETAILS_FLYOUT_BTN).eq(rowIndex).click();
  cy.get(TIMELINE_DETAILS_FLYOUT).should('be.visible');
};

export const openHostDetailsFlyout = (rowIndex: number) => {
  cy.get(HOST_DETAILS_FLYOUT).eq(rowIndex).click();
  cy.get(TIMELINE_DETAILS_FLYOUT).should('be.visible');
};

export const openUserDetailsFlyout = (rowIndex: number) => {
  cy.get(USER_DETAILS_FLYOUT).eq(rowIndex).click();
  cy.get(TIMELINE_DETAILS_FLYOUT).should('be.visible');
};
