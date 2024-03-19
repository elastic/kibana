/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addDiscoverEsqlQuery,
  addFieldToTable,
  submitDiscoverSearchBar,
  verifyDiscoverEsqlQuery,
} from '../../../../tasks/discover';
import { navigateFromHeaderTo } from '../../../../tasks/security_header';
import {
  DISCOVER_CONTAINER,
  DISCOVER_DATA_VIEW_SWITCHER,
  GET_DISCOVER_DATA_GRID_CELL_HEADER,
} from '../../../../screens/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import {
  closeTimeline,
  goToEsqlTab,
  openActiveTimeline,
  addNameAndDescriptionToTimeline,
  saveTimeline,
} from '../../../../tasks/timeline';
import { ALERTS_URL } from '../../../../urls/navigation';
import { getTimeline } from '../../../../objects/timeline';
import { ALERTS, CSP_FINDINGS } from '../../../../screens/security_header';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';
const DEFAULT_ESQL_QUERY = '';

// FAILURE introduced by the fix for 8.11.4 related to the default empty string and fix for the infinite loop on the esql tab
describe.skip(
  'Timeline Discover ESQL State',
  {
    tags: ['@ess'],
  },
  () => {
    beforeEach(() => {
      login();
      visitWithTimeRange(ALERTS_URL);
      openActiveTimeline();
      cy.window().then((win) => {
        win.onbeforeunload = null;
      });
      goToEsqlTab();
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
    });
    it('should not allow the dataview to be changed', () => {
      cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('not.exist');
    });
    it('should have the default esql query on load', () => {
      verifyDiscoverEsqlQuery(DEFAULT_ESQL_QUERY);
    });
    it('should remember esql query when navigating away and back to discover ', () => {
      const esqlQuery = 'from auditbeat-* | limit 5';
      addDiscoverEsqlQuery(esqlQuery);
      submitDiscoverSearchBar();
      addNameAndDescriptionToTimeline(getTimeline());
      saveTimeline();
      closeTimeline();
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      goToEsqlTab();

      verifyDiscoverEsqlQuery(esqlQuery);
    });
    it('should remember columns when navigating away and back to discover ', () => {
      const esqlQuery = 'from auditbeat-* | limit 5';
      addDiscoverEsqlQuery(esqlQuery);
      submitDiscoverSearchBar();
      addNameAndDescriptionToTimeline(getTimeline());
      addFieldToTable('host.name');
      addFieldToTable('user.name');
      saveTimeline();
      closeTimeline();
      navigateFromHeaderTo(CSP_FINDINGS);
      navigateFromHeaderTo(ALERTS);
      openActiveTimeline();
      goToEsqlTab();
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('host.name')).should('exist');
      cy.get(GET_DISCOVER_DATA_GRID_CELL_HEADER('user.name')).should('exist');
    });
  }
);
