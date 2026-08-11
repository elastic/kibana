/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import {
  MANAGE_NAVIGATION_ITEMS,
  SECURITY_SOLUTION_NAVBAR_MANAGE_ITEM,
  SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM,
  UPDATE_STATUS,
} from '../../screens/threat_intelligence/common';
import {
  BARCHART_POPOVER_BUTTON,
  BARCHART_WRAPPER,
  FLYOUT_CLOSE_BUTTON,
  FLYOUT_JSON_TAB,
  FLYOUT_TABLE_TAB,
  FLYOUT_TAKE_ACTION_BUTTON,
  INDICATORS_TABLE,
  INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON,
  REFRESH_BUTTON,
  TOGGLE_FLYOUT_BUTTON,
} from '../../screens/threat_intelligence/indicators';

/**
 * Navigate to Blocklist screen via the Security Solution navbar and Manage menu item
 */
export const navigateToBlocklist = () => {
  cy.get(SECURITY_SOLUTION_NAVBAR_MANAGE_ITEM).click();
  cy.get(MANAGE_NAVIGATION_ITEMS).contains('Blocklist').click();
};

/**
 * Navigate to Threat Intelligence screen via the Security Solution navbar
 */
export const navigateToThreatIntelligence = () => {
  cy.get(SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM).click();
};

/**
 * Close the opened flyout
 */
export const closeFlyout = () => {
  cy.get(FLYOUT_CLOSE_BUTTON).click();
};

/**
 * Open the indicators table more actions menu
 */
export const openIndicatorsTableMoreActions = (index = 0) => {
  cy.get(INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON).eq(index).click();
};

/**
 * Open the indicator flyout from indicators table
 */
export const openFlyout = (index = 0) => {
  cy.get(TOGGLE_FLYOUT_BUTTON).eq(index).click();
};

/**
 * Open the take action button within indicator flyout
 */
export const openFlyoutTakeAction = () => {
  cy.get(FLYOUT_TAKE_ACTION_BUTTON).first().click();
};

/**
 * Navigate to Table tab in indicators flyout
 */
export const navigateToFlyoutTableTab = () => {
  cy.get(FLYOUT_TABLE_TAB).click();
};

/**
 * Navigate to Json tab in indicators flyout
 */
export const navigateToFlyoutJsonTab = () => {
  cy.get(FLYOUT_JSON_TAB).click();
};

/**
 * Wait for the view to be fully loaded.
 *
 * The indicators table only renders once the underlying search has resolved with at least one
 * hit (see `IndicatorsTable`'s `isLoading`/`indicatorCount` gating in the app code). On a fresh
 * page load, the initial indicators search can occasionally resolve before the page's data
 * view/index pattern has fully settled, leaving the table permanently absent even though the
 * underlying data exists (see #239929, #246404, #246405, and #246885). Rather than passively
 * polling the DOM for the whole timeout budget, click the query bar's refresh button every so
 * often to re-trigger the search — this reliably recovers the view instead of a single wait.
 *
 * When the KQL bar itself is absent (the page stalled during initialisation before the search
 * bar mounted), a hard reload is the only recovery — a missing bar means the data view
 * bootstrap never completed and clicking elsewhere on the page does nothing.
 *
 * After issuing a reload, wait for the KQL bar to reappear before returning to the recurse
 * loop. Without this, the 2 s inter-iteration delay is shorter than the time Kibana needs to
 * mount the security-solution app (~3 s observed in CI), causing the loop to reload again
 * before the previous reload has settled — each reload interrupts the one before it and the
 * table never gets a chance to render.
 */
export const waitForViewToBeLoaded = () => {
  recurse(
    () => {
      return cy.get('body').then(($body) => {
        if ($body.find(INDICATORS_TABLE).length > 0) {
          return true;
        }
        if ($body.find(REFRESH_BUTTON).length === 0) {
          cy.reload();
          cy.get(REFRESH_BUTTON, { timeout: 15000 }).should('exist');
        } else {
          cy.get(REFRESH_BUTTON).click();
        }
        return false;
      });
    },
    (isTableVisible) => isTableVisible === true,
    { delay: 2000, timeout: 180000 }
  );

  cy.get(INDICATORS_TABLE).should('exist');
  cy.get(BARCHART_WRAPPER).should('exist');
  waitForViewToBeUpdated();
};

/**
 * Wait for the view to be updated
 */
export const waitForViewToBeUpdated = () => {
  cy.get(UPDATE_STATUS).should('contain.text', 'Updated');
};

/**
 * Open barchart 3-dot popover menu
 */
export const openBarchartPopoverMenu = () => {
  cy.get(BARCHART_POPOVER_BUTTON).first().click();
};

/**
 * Performs click on element that require a mouse hover first
 */
export const clickAction = (propertySelector: string, rowIndex: number, actionSelector: string) => {
  recurse(
    () => {
      cy.get(propertySelector).filter(':visible').eq(rowIndex).trigger('mouseover');
      return cy.get(actionSelector).first();
    },
    ($el) => $el.is(':visible')
  );

  cy.get(actionSelector).first().click();
};
