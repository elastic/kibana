/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const changeAlertsFilter = (text: string) => {
  cy.getByTestSubj('kbnQueryBar').within(() => {
    cy.getByTestSubj('queryInput').type(text);
    cy.getByTestSubj('querySubmitButton').click();
  });
};

/* copied from test/security_solution_cypress/cypress/tasks/create_new_rule */
export const DETECTION_PAGE_FILTER_GROUP_WRAPPER = '.filter-group__wrapper';
export const DETECTION_PAGE_FILTERS_LOADING = '.securityPageWrapper .controlFrame--controlLoading';
export const DETECTION_PAGE_FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';
export const OPTION_LISTS_LOADING = '.optionsList--filterBtnWrapper .euiLoadingSpinner';
export const DATAGRID_CHANGES_IN_PROGRESS = '[data-test-subj="body-data-grid"] .euiProgress';
export const EVENT_CONTAINER_TABLE_LOADING = '[data-test-subj="internalAlertsPageLoading"]';
export const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';
export const ALERTS_URL = '/app/security/alerts';
export const REFRESH_BUTTON = `[data-test-subj="kbnQueryBar"] [data-test-subj="querySubmitButton"]`;
export const EMPTY_ALERT_TABLE = '[data-test-subj="alertsTableEmptyState"]';
export const ALERTS_TABLE_COUNT = `[data-test-subj="toolbar-alerts-count"]`;
export const ALERTS_TAB = '[data-test-subj="navigation-alerts"]';

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};

export const waitForPageFilters = () => {
  cy.log('Waiting for Page Filters');
  cy.url().then((urlString) => {
    const url = new URL(urlString);
    if (url.pathname.endsWith(ALERTS_URL)) {
      // since these are only valid on the alert page
      cy.get(DETECTION_PAGE_FILTER_GROUP_WRAPPER).should('exist');
      cy.get(DETECTION_PAGE_FILTER_GROUP_LOADING).should('not.exist');
      cy.get(DETECTION_PAGE_FILTERS_LOADING).should('not.exist');
      cy.get(OPTION_LISTS_LOADING).should('have.lengthOf', 0);
    } else {
      cy.log('Skipping Page Filters Wait');
    }
  });
};

export const waitForAlerts = () => {
  /*
   * below line commented because alertpagefiltersenabled feature flag
   * is disabled by default
   * target: enable by default in v8.8
   *
   * waitforpagefilters();
   *
   * */
  waitForPageFilters();
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
  cy.get(DATAGRID_CHANGES_IN_PROGRESS).should('not.be.true');
  cy.get(EVENT_CONTAINER_TABLE_LOADING).should('not.exist');
  cy.get(LOADING_INDICATOR).should('not.exist');
};

export const waitForAlertsToPopulate = (
  alertCountThreshold = 1,
  interval = 500,
  timeout = 12000
) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for alerts to appear');
      cy.get(REFRESH_BUTTON).click({ force: true });
      cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
      return cy.root().then(($el) => {
        const emptyTableState = $el.find(EMPTY_ALERT_TABLE);
        if (emptyTableState.length > 0) {
          cy.log('Table is empty', emptyTableState.length);
          return false;
        }
        const countEl = $el.find(ALERTS_TABLE_COUNT);
        const alertCount = parseInt(countEl.text(), 10) || 0;
        return alertCount >= alertCountThreshold;
      });
    },
    { interval, timeout }
  );
  waitForAlerts();
};
