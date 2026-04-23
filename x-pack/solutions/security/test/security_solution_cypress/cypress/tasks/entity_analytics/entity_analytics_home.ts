/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IS_LOADING_GROUPING_TABLE,
  GROUPING_LEVEL_0,
  GROUP_SELECTOR_DROPDOWN,
  GLOBAL_LOADING_INDICATOR_HIDDEN,
  GLOBAL_LOADING_INDICATOR,
} from '../../screens/entity_analytics/entity_analytics_home';

const ENTITY_STORE_SEARCH_API = '/internal/search/ese';

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
 * Waits for the grouping table to finish loading by intercepting the
 * underlying search request and confirming the DOM is ready.
 */
export const waitForGroupingTable = () => {
  cy.get(IS_LOADING_GROUPING_TABLE).should('not.exist');
  cy.get(GROUPING_LEVEL_0).should('exist');
};

/**
 * Intercepts the entity store search API and registers an alias.
 * Call this before navigation so Cypress captures the request.
 */
export const interceptEntityStoreSearch = () => {
  cy.intercept('POST', ENTITY_STORE_SEARCH_API).as('entityStoreSearch');
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
