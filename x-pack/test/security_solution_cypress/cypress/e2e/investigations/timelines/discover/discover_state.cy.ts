/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillAddFilterForm } from '../../../../tasks/search_bar';
import {
  addDiscoverKqlQuery,
  addFieldToTable,
  openAddDiscoverFilterPopover,
  submitDiscoverSearchBar,
  switchDataViewTo,
} from '../../../../tasks/discover';
import { navigateFromHeaderTo } from '../../../../tasks/security_header';
import {
  DISCOVER_CONTAINER,
  DISCOVER_QUERY_INPUT,
  DISCOVER_FILTER_BADGES,
  DISCOVER_DATA_VIEW_SWITCHER,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
} from '../../../../screens/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import {
  createNewTimeline,
  gotToDiscoverTab,
  openActiveTimeline,
} from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';
import { ALERTS, CSP_FINDINGS } from '../../../../screens/security_header';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const DEFAULT_ESQL_QUERY =
  'from .alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame...,';

// FLAKY: https://github.com/elastic/kibana/issues/165663
// FLAKY: https://github.com/elastic/kibana/issues/165747
describe(
  'Discover State',
  {
    env: { ftrConfig: { enableExperimental: ['discoverInTimeline'] } },
    tags: ['@ess', '@serverless', '@brokenInServerless'],
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      createNewTimeline();
      gotToDiscoverTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });
    it('should not allow the dataview to be changed', () => {
      cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('be.disabled');
      cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', 'ES|QL');
    });
    it('should have the default esql query on load', () => {
      cy.get(DISCOVER_QUERY_INPUT).should('have.text', DEFAULT_ESQL_QUERY);
    });
    it.skip('should remember esql query when navigating away and back to discover ', () => {
      const esqlQuery = 'from .alerts-security.alerts-* | limit 100';
      addDiscoverKqlQuery(esqlQuery);
      submitDiscoverSearchBar();
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      gotToDiscoverTab();
      cy.get(DISCOVER_QUERY_INPUT).should('have.text', esqlQuery);
    });
    it('should remember filters when navigating away and back to discover ', () => {
      openAddDiscoverFilterPopover();
      fillAddFilterForm({
        key: 'agent.type',
        value: 'winlogbeat',
      });
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      gotToDiscoverTab();
      cy.get(DISCOVER_FILTER_BADGES).should('have.length', 1);
    });
    it.skip('should remember dataView when navigating away and back to discover ', () => {
      const dataviewName = '.kibana-event-log';
      switchDataViewTo(dataviewName);
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      gotToDiscoverTab();
      cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', dataviewName);
    });
    it('should remember columns when navigating away and back to discover ', () => {
      addFieldToTable('host.name');
      addFieldToTable('user.name');
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      gotToDiscoverTab();
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('host.name')).should('exist');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('user.name')).should('exist');
    });
  }
);
