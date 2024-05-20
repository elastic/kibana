/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import {
  GLOBAL_SEARCH_BAR_FILTER_ITEM,
  GLOBAL_SEARCH_BAR_PINNED_FILTER,
} from '../../../screens/search_bar';
import {
  DISCOVER_WITH_FILTER_URL,
  DISCOVER_WITH_PINNED_FILTER_URL,
} from '../../../urls/navigation';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../../tasks/kibana_navigation';
import { ALERTS_PAGE } from '../../../screens/kibana_navigation';
import { deleteDataView, postDataView } from '../../../tasks/api_calls/common';
import { navigateToAlertsPageInServerless } from '../../../tasks/serverless/navigation';

const DATAVIEW = 'audit*';

describe('ESS - pinned filters', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    deleteDataView(DATAVIEW);
    postDataView(DATAVIEW);
    login();
  });

  it('show pinned filters on security', () => {
    visit(DISCOVER_WITH_PINNED_FILTER_URL);

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).find(GLOBAL_SEARCH_BAR_PINNED_FILTER).should('exist');
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(ALERTS_PAGE);

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', 'host.name: test-host');
  });

  it('does not show discover filters on security', () => {
    visit(DISCOVER_WITH_FILTER_URL);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('exist');

    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(ALERTS_PAGE);

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
  });
});

describe('SERVERLESS - pinned filters', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
    deleteDataView(DATAVIEW);
    postDataView(DATAVIEW);
    login();
  });

  it('show pinned filters on security', () => {
    visit(DISCOVER_WITH_PINNED_FILTER_URL);

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).find(GLOBAL_SEARCH_BAR_PINNED_FILTER).should('exist');
    navigateToAlertsPageInServerless();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('have.text', 'host.name: test-host');
  });

  it('does not show discover filters on security', () => {
    visit(DISCOVER_WITH_FILTER_URL);
    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('exist');

    navigateToAlertsPageInServerless();

    cy.get(GLOBAL_SEARCH_BAR_FILTER_ITEM).should('not.exist');
  });
});
