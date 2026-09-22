/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import {
  SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM,
  UPDATE_STATUS,
} from '../../screens/threat_intelligence/common';
import { BLOCKLIST_URL } from '../../urls/navigation';
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
 * Navigate to Blocklist screen.
 *
 * This is a full page load rather than a navbar click: the Blocklist link is nested inside the
 * collapsible Manage section of the Security side navigation and is not reliably reachable from
 * a Threat Intelligence page. Because it is a full page load, any Security Solution global state
 * held in the URL (most notably the time range) is dropped, so callers that navigate back to a
 * data driven view must re-establish it themselves.
 */
export const navigateToBlocklist = () => {
  cy.visit(BLOCKLIST_URL);
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

const VIEW_LOAD_TIMEOUT = 150000;
const VIEW_LOAD_GRACE_TIMEOUT = 30000;
const VIEW_LOAD_POLL_DELAY = 1000;
const POLLS_BETWEEN_SEARCH_RETRIES = 15;
const POLLS_BEFORE_PAGE_RELOAD = 60;
const MAX_PAGE_RELOADS = 1;

/**
 * Wait for the view to be fully loaded.
 *
 * The indicators table only renders once the underlying search has resolved with at least one
 * hit (see the `isLoading`/`indicatorCount` gating in the app's indicators table). On a fresh
 * page load, the initial indicators search can occasionally resolve before the page's data
 * view/index pattern has fully settled, leaving the table permanently absent even though the
 * underlying data exists (see #239929, #246404, #246405, and #246885). Rather than passively
 * polling the DOM for the whole timeout budget, re-run the search via the query bar's refresh
 * button once the page has had a fair chance to settle on its own, and only fall back to a
 * single full page reload when even that does not bring the table back.
 *
 * The loop is deliberately made of non-failing commands only (`doNotFail` plus DOM probing
 * instead of `cy.wait` on an aliased request): recovery attempts are best effort, so a slow
 * page must never turn into a hard error inside a `beforeEach`. When the table never shows up,
 * the assertions below produce the failure, exactly as they did before this helper existed. They
 * only need a short grace period, the recursion above already owns the waiting budget.
 */
export const waitForViewToBeLoaded = () => {
  let polls = 0;
  let reloads = 0;

  recurse(
    () =>
      cy.get('body').then(($body) => {
        if ($body.find(INDICATORS_TABLE).length > 0) {
          return true;
        }

        polls += 1;

        if (polls >= POLLS_BEFORE_PAGE_RELOAD && reloads < MAX_PAGE_RELOADS) {
          polls = 0;
          reloads += 1;
          cy.log('Indicators table still missing, reloading the page');
          cy.reload();
          return false;
        }

        if (
          polls % POLLS_BETWEEN_SEARCH_RETRIES === 0 &&
          $body.find(`${REFRESH_BUTTON}:enabled`).length > 0
        ) {
          cy.log('Indicators table still missing, re-running the indicators search');
          // this is a best effort recovery attempt, it must never fail the surrounding hook
          cy.get(REFRESH_BUTTON).click({ force: true });
        }

        return false;
      }),
    (isTableRendered) => isTableRendered === true,
    {
      delay: VIEW_LOAD_POLL_DELAY,
      timeout: VIEW_LOAD_TIMEOUT,
      log: false,
      doNotFail: true,
    }
  );

  cy.get(INDICATORS_TABLE, { timeout: VIEW_LOAD_GRACE_TIMEOUT }).should('exist');
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

  // while { force: true } shouldn't really be used, here it allows us to get rid of flakiness on things that need an mouse hover
  cy.get(actionSelector).first().click({ force: true });
};
