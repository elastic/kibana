/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../tasks/navigation';
import {
  closeFlyout,
  navigateToFlyoutTableTab,
  openFlyout,
  waitForViewToBeLoaded,
  waitForViewToBeUpdated,
} from '../../../tasks/threat_intelligence/common';
import {
  clearKQLBar,
  filterInFromBarChartLegend,
  filterInFromFlyoutBlockItem,
  filterInFromFlyoutOverviewTable,
  filterInFromFlyoutTableTab,
  filterInFromTableCell,
  filterOutFromBarChartLegend,
  filterOutFromFlyoutBlockItem,
  filterOutFromFlyoutOverviewTable,
  filterOutFromFlyoutTableTab,
  filterOutFromTableCell,
} from '../../../tasks/threat_intelligence/query_bar';
import { INDICATOR_TYPE_CELL } from '../../../screens/threat_intelligence/indicators';
import { KQL_FILTER } from '../../../screens/threat_intelligence/query_bar';
import { login } from '../../../tasks/login';

const URL = '/app/security/threat_intelligence/indicators';

// Failing: See https://github.com/elastic/kibana/issues/193804
describe.skip('Indicators query bar interaction', { tags: ['@ess'] }, () => {
  before(() => cy.task('esArchiverLoad', { archiveName: 'ti_indicators_data_multiple' }));

  after(() => cy.task('esArchiverUnload', { archiveName: 'ti_indicators_data_multiple' }));

  beforeEach(() => {
    login();
    visitWithTimeRange(URL);
    waitForViewToBeLoaded();
  });

  it('should add filter to kql', () => {
    cy.log('filter in values when clicking in the barchart legend');

    waitForViewToBeUpdated();

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterInFromBarChartLegend();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in the barchart legend');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterOutFromBarChartLegend();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators table cell');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterInFromTableCell();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out and out values when clicking in an indicators table cell');

    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterOutFromTableCell();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout overview tab block');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    filterInFromFlyoutBlockItem();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout overview block');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    filterOutFromFlyoutBlockItem();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout overview tab table row');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    filterInFromFlyoutOverviewTable();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout overview tab row');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    filterOutFromFlyoutOverviewTable();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout table tab action column');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    navigateToFlyoutTableTab();
    filterInFromFlyoutTableTab();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout table tab action column');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout();
    navigateToFlyoutTableTab();
    filterOutFromFlyoutTableTab();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });
});
