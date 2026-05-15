/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ANALYTICS_HOME_PAGE_LOADER,
  IS_LOADING_GROUPING_TABLE,
  GROUPING_LEVEL_0,
  GROUP_SELECTOR_DROPDOWN,
  GLOBAL_LOADING_INDICATOR_HIDDEN,
  GLOBAL_LOADING_INDICATOR,
  PAGE_TITLE,
} from '../../screens/entity_analytics/entity_analytics_home';

const ENTITY_STORE_SEARCH_API = '/internal/search/ese';

/** Time for global nav, Entity Analytics shell, and sourcerer to settle (CI can be slow). */
const ENTITY_ANALYTICS_HOME_READY_TIMEOUT_MS = 120_000;

/**
 * Sets the grouping via localStorage before navigating to avoid flaky
 * dropdown interactions (search responses can close the popover mid-click).
 * @kbn/grouping stores state under `localStorage.groups` keyed by groupingId.
 */
export const setGrouping = (activeGroups: string[]) => {
  cy.window().then((win) =>
    win.localStorage.setItem(
      'groups',
      JSON.stringify({ 'entityAnalytics:grouping': { activeGroups } })
    )
  );
};

/**
 * Waits for Kibana global navigation loading to finish, the Entity Analytics home
 * shell to mount (past EmptyPrompt / data-view PageLoader), and the page-level
 * sourcerer spinner to disappear so charts and grid are in the DOM.
 */
export const waitForEntityAnalyticsHomeShell = () => {
  cy.get(GLOBAL_LOADING_INDICATOR_HIDDEN, {
    timeout: ENTITY_ANALYTICS_HOME_READY_TIMEOUT_MS,
  }).should('exist');
  cy.get(GLOBAL_LOADING_INDICATOR).should('not.exist');
  cy.get(PAGE_TITLE, { timeout: ENTITY_ANALYTICS_HOME_READY_TIMEOUT_MS }).should('exist');
  cy.get(ENTITY_ANALYTICS_HOME_PAGE_LOADER, {
    timeout: ENTITY_ANALYTICS_HOME_READY_TIMEOUT_MS,
  }).should('not.exist');
};

/**
 * Waits for the grouping table to finish loading by intercepting the
 * underlying search request and confirming the DOM is ready.
 */
export const waitForGroupingTable = () => {
  cy.get(IS_LOADING_GROUPING_TABLE).should('not.exist');
  cy.get(GROUPING_LEVEL_0).should('exist');
};

/**
 * Waits for the entity store status intercept and the initial entity store
 * search to both resolve, then confirms the grouping table is ready.
 *
 * Must be called after `interceptEntityStoreStatus` and
 * `interceptEntityStoreSearch` are registered and after `cy.visit`.
 *
 * The search fires only once the sourcerer / data-view has finished loading,
 * which can take well over 5 s in CI — both timeouts are set to 20 s to
 * match the patience already applied to `@entityStoreStatus`.
 */
export const waitForEntityAnalyticsPageReady = () => {
  cy.wait('@entityStoreStatus', { timeout: 20000 });
  cy.wait('@entityStoreSearch', { timeout: 20000 });
  waitForGroupingTable();
};

/**
 * Intercepts the entity store search API and registers an alias.
 * Call this before navigation so Cypress captures the request.
 */
export const interceptEntityStoreSearch = () => {
  cy.intercept('POST', ENTITY_STORE_SEARCH_API).as('entityStoreSearch');
};

export const interceptEntityStoreStatus = (status: 'running' | 'not_installed') => {
  cy.intercept(
    { method: 'GET', pathname: '/api/security/entity_store/status' },
    {
      statusCode: 200,
      body: { status, engines: [] },
    }
  ).as('entityStoreStatus');
};

/**
 * Opens the grouping dropdown and selects the given option.
 * Waits for in-flight search requests via API intercept before interacting.
 */
export const selectGroupingOption = (panelSelector: string) => {
  cy.get(GLOBAL_LOADING_INDICATOR_HIDDEN).should('exist');
  cy.get(GLOBAL_LOADING_INDICATOR).should('not.exist');
  cy.get(IS_LOADING_GROUPING_TABLE).should('not.exist');

  cy.get(`${GROUP_SELECTOR_DROPDOWN}:visible`).click();
  cy.get(panelSelector).should('be.visible').click();
};
