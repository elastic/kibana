/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_TO_TIMELINE,
  COPY,
  FILTER_IN,
  FILTER_OUT,
  IPS_TABLE_LOADED,
  SHOW_TOP_FIELD,
  EXPAND_OVERFLOW_ITEMS,
  OVERFLOW_ITEM,
} from '../../screens/network/flows';
import { EUI_ICON_IS_LOADING } from '../../screens/common/controls';

export const waitForIpsTableToBeLoaded = () => {
  cy.get(IPS_TABLE_LOADED).should('exist');
};

export const openHoverActions = () => {
  cy.get(EXPAND_OVERFLOW_ITEMS).first().click({ scrollBehavior: 'center' });
};

export const mouseoverOnToOverflowItem = () => {
  cy.get(OVERFLOW_ITEM).first().trigger('mouseover');
};

export const clickOnFilterIn = () => {
  cy.get(FILTER_IN).first().click();
};

export const clickOnFilterOut = () => {
  cy.get(FILTER_OUT).first().click();
};

export const clickOnAddToTimeline = () => {
  cy.get(`${ADD_TO_TIMELINE} ${EUI_ICON_IS_LOADING}`).should('not.exist');
  cy.get(ADD_TO_TIMELINE).first().click();
};

export const clickOnShowTopN = () => {
  cy.get(SHOW_TOP_FIELD).first().click();
};

export const clickOnCopyValue = () => {
  cy.get(COPY).first().click();
};
