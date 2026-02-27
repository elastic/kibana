/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from '../../../tasks/navigation';
import { login } from '../../../tasks/login';
import { ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  WATCHLISTS_MANAGEMENT_PAGE_TITLE,
  WATCHLISTS_MANAGEMENT_TABLE_EMPTY,
  WATCHLISTS_MANAGEMENT_TABLE_ERROR,
  WATCHLISTS_MANAGEMENT_TABLE_LOADING,
  WATCHLISTS_MANAGEMENT_TABLE,
} from '../../../screens/entity_analytics/watchlists_management';

describe(
  'Entity Analytics Watchlists Management Page ',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsWatchlistEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
    });

    const WATCHLISTS_LIST_URL = '/api/entity_analytics/watchlists/list';

    it('renders page as expected', () => {
      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.url({ timeout: 10000 }).should('include', ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.get(WATCHLISTS_MANAGEMENT_PAGE_TITLE, { timeout: 60000 }).should('exist');
    });

    it('shows empty state when no watchlists are returned', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 200,
        body: [],
      }).as('watchlistsList');

      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_EMPTY).should('exist');
    });

    it('shows error callout when watchlists request fails', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 500,
        body: { message: 'Internal Server Error' },
      }).as('watchlistsList');

      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_ERROR).should('exist');
    });

    it('shows loading indicator while watchlists request is pending', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        delayMs: 1000,
        statusCode: 200,
        body: [],
      }).as('watchlistsList');

      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_LOADING).should('exist');
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_LOADING).should('not.exist');
    });

    it('shows table when watchlists are returned', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 200,
        body: [
          {
            name: 'Test watchlist',
            users: [{ name: 'user-1' }, { name: 'user-2' }],
            riskModifier: 50,
            source: 'manual',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }).as('watchlistsList');

      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).should('exist');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains('Test watchlist');
    });
  }
);
