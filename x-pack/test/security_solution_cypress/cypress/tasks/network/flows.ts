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
  cy.get(OVERFLOW_ITEM).first().realHover();
};

/**
 * What is crucial here is that we need to verify whether or not the actions portal element is visible,
 * and only then we can perform the action. This is done immediately before any action is performed on the actions button itself,
 * and if for some reason the actions portal element is not visible, we will try to hover over the actions activator element again.
 * @param action
 * @param maxTries
 */
export function withHoverActionsReady(action: () => void, maxTries = 10) {
  // NOTE: not sure if this is precise enough, but it seems to work
  const actionsButtonInPortal = '[data-euiportal="true"] button[data-test-subj*="cellActions"]';

  // Check if actions portal element is visible
  cy.get('body').then(($body) => {
    if ($body.find(actionsButtonInPortal).length > 0) {
      cy.get(actionsButtonInPortal).should('be.visible');
      action();
    } else if (maxTries <= 0) {
      throw new Error(`Max tries reached. The element ${actionsButtonInPortal} is not visible.`);
    } else {
      openHoverActions();
      mouseoverOnToOverflowItem();
      withHoverActionsReady(action, maxTries - 1);
    }
  });
}

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
  cy.get(COPY).first().focus();
  cy.focused().click({ force: true }); // eslint-disable-line cypress/unsafe-to-chain-command
};
