/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOSE_ALERT_BTN, MARK_ALERT_ACKNOWLEDGED_BTN, OPEN_ALERT_BTN } from '../screens/alerts';
import {
  JSON_VIEW_TAB,
  TABLE_TAB,
  FILTER_INPUT,
  OVERVIEW_STATUS,
  EVENT_DETAILS_ALERT_STATUS_POPOVER,
} from '../screens/alerts_details';

export const filterBy = (value: string) => {
  cy.get(FILTER_INPUT).type(value);
};

export const openJsonView = () => {
  cy.get(JSON_VIEW_TAB).click();
};

export const openTable = () => {
  cy.get(TABLE_TAB).click();
};

export const changeAlertStatusTo = (status: 'open' | 'closed' | 'acknowledged') => {
  cy.get(OVERVIEW_STATUS).click();
  cy.get(EVENT_DETAILS_ALERT_STATUS_POPOVER).should('be.visible');

  if (status === 'acknowledged') {
    cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
    return;
  }
  if (status === 'open') {
    cy.get(OPEN_ALERT_BTN).click();
  }

  if (status === 'closed') {
    cy.get(CLOSE_ALERT_BTN).click();
  }
};
