/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVMON_PRIVILEGE_CHECK_API } from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/constants';
import { WATCHLISTS_URL } from '@kbn/security-solution-plugin/common/entity_analytics/watchlists/constants';
import { visit } from '../../../tasks/navigation';
import { login } from '../../../tasks/login';
import { ENTITY_ANALYTICS_MANAGEMENT_URL } from '../../../urls/navigation';

const ENTITY_ANALYTICS_WATCHLISTS_TAB_URL = `${ENTITY_ANALYTICS_MANAGEMENT_URL}/watchlists`;
import {
  WATCHLISTS_MANAGEMENT_TABLE_EMPTY,
  WATCHLISTS_MANAGEMENT_TABLE_ERROR,
  WATCHLISTS_MANAGEMENT_TABLE_LOADING,
  WATCHLISTS_MANAGEMENT_TABLE,
} from '../../../screens/entity_analytics/watchlists_management';

// Failing: See https://github.com/elastic/kibana/issues/256685
describe.skip(
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
    const WATCHLISTS_LIST_URL = `${WATCHLISTS_URL}/list`;
    const visitWatchlistsPage = () => {
      visit(ENTITY_ANALYTICS_WATCHLISTS_TAB_URL);
    };

    const interceptWatchlistsList = (
      getBody: () => Array<{
        id: string;
        name: string;
        description: string;
        users: Array<{ name: string }>;
        riskModifier: number;
        source: string;
        updatedAt: string;
      }>
    ) => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, (req) => {
        req.reply({
          statusCode: 200,
          body: getBody(),
        });
      }).as('watchlistsList');
    };

    const buildWatchlist = (
      overrides: Partial<{
        id: string;
        name: string;
        description: string;
        users: Array<{ name: string }>;
        riskModifier: number;
        source: string;
        updatedAt: string;
      }> = {}
    ) => ({
      id: 'watchlist-1',
      name: 'Test watchlist',
      description: 'Test watchlist description',
      users: [{ name: 'user-1' }],
      riskModifier: 1.5,
      source: 'manual',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    });

    beforeEach(() => {
      login();
      cy.intercept('GET', PRIVMON_PRIVILEGE_CHECK_API, {
        statusCode: 200,
        body: {
          has_all_required: true,
          has_read_permissions: true,
          has_write_permissions: true,
          privileges: {
            elasticsearch: {
              cluster: {},
              index: {},
            },
            kibana: {},
          },
        },
      }).as('watchlistsPrivileges');
    });

    it('renders page as expected', () => {
      visit(ENTITY_ANALYTICS_WATCHLISTS_TAB_URL);
      cy.url({ timeout: 10000 }).should('include', ENTITY_ANALYTICS_WATCHLISTS_TAB_URL);
      cy.contains('h1', 'Entity Analytics Management', { timeout: 60000 }).should('exist');
    });

    it('shows empty state when no watchlists are returned', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 200,
        body: [],
      }).as('watchlistsList');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_EMPTY).should('exist');
    });

    it('shows error callout when watchlists request fails', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 500,
        body: { message: 'Internal Server Error' },
      }).as('watchlistsList');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_ERROR).should('exist');
    });

    it('shows loading indicator while watchlists request is pending', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        delayMs: 1000,
        statusCode: 200,
        body: [],
      }).as('watchlistsList');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_LOADING).should('exist');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_LOADING).should('not.exist');
    });

    it('shows table when watchlists are returned', () => {
      cy.intercept('GET', WATCHLISTS_LIST_URL, {
        statusCode: 200,
        body: [
          buildWatchlist({
            users: [{ name: 'user-1' }, { name: 'user-2' }],
            riskModifier: 50,
          }),
        ],
      }).as('watchlistsList');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).should('exist');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains('Test watchlist');
    });

    it('creates a watchlist via the flyout', () => {
      const watchlistName = 'cypress_watchlist';
      const watchlistDescription = 'Watchlist created via flyout';
      let watchlists: Array<{
        id: string;
        name: string;
        description: string;
        users: Array<{ name: string }>;
        riskModifier: number;
        source: string;
        updatedAt: string;
      }> = [];

      interceptWatchlistsList(() => watchlists);

      cy.intercept('POST', WATCHLISTS_URL, (req) => {
        expect(req.body).to.include({
          name: watchlistName,
          description: watchlistDescription,
        });
        const createdWatchlist = buildWatchlist({
          name: watchlistName,
          description: watchlistDescription,
          riskModifier: req.body.riskModifier ?? 1.5,
          updatedAt: new Date().toISOString(),
        });
        watchlists = [createdWatchlist];
        req.reply({ statusCode: 200, body: createdWatchlist });
      }).as('createWatchlist');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_EMPTY).should('exist');

      cy.contains('button', 'Create').click();
      cy.get('[data-test-subj="watchlist-flyout-header"]').should('exist');
      cy.get('input[name="WatchlistName"]').type(watchlistName);
      cy.get('input[name="WatchlistDescription"]').type(watchlistDescription);
      cy.get('[data-test-subj="watchlist-flyout-save"]').click();
      cy.wait('@createWatchlist');
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).should('exist');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains(watchlistName);
    });

    it('deletes a watchlist via the actions menu', () => {
      const existingWatchlist = buildWatchlist({
        name: 'Existing Watchlist',
        description: 'Watchlist ready for deletion',
      });
      let watchlists = [existingWatchlist];

      interceptWatchlistsList(() => watchlists);

      cy.intercept('GET', `${WATCHLISTS_URL}/${existingWatchlist.id}`, {
        statusCode: 200,
        body: existingWatchlist,
      }).as('getWatchlist');

      cy.intercept('DELETE', `${WATCHLISTS_URL}/*`, (req) => {
        watchlists = [];
        req.reply({ statusCode: 200, body: { deleted: true } });
      }).as('deleteWatchlist');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).should('exist');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains(existingWatchlist.name);

      cy.get('[aria-label="Watchlist actions"]').click();
      cy.get('[data-test-subj="watchlistsManagementTableActionDelete"]').click();
      cy.get('[data-test-subj="watchlistsDeleteConfirmationModal"]').should('exist');
      cy.contains('button', 'Delete').click();
      cy.wait('@deleteWatchlist');
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE_EMPTY).should('exist');
    });

    it('updates a watchlist via edit mode', () => {
      const existingWatchlist = buildWatchlist({
        id: 'watchlist-2',
        name: 'editable_watchlist',
        description: 'Original description',
      });
      const updatedName = 'editable_watchlist_updated';
      let watchlists = [existingWatchlist];

      interceptWatchlistsList(() => watchlists);

      cy.intercept('GET', `${WATCHLISTS_URL}/${existingWatchlist.id}`, {
        statusCode: 200,
        body: existingWatchlist,
      }).as('getWatchlist');

      cy.intercept('PUT', `${WATCHLISTS_URL}/*`, (req) => {
        expect(req.body).to.include({
          name: updatedName,
          description: existingWatchlist.description,
        });
        watchlists = [
          {
            ...existingWatchlist,
            name: updatedName,
            updatedAt: new Date().toISOString(),
          },
        ];
        req.reply({ statusCode: 200, body: watchlists[0] });
      }).as('updateWatchlist');

      visitWatchlistsPage();
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains(existingWatchlist.name);

      cy.get('[aria-label="Edit watchlist"]').click();
      cy.wait('@getWatchlist');
      cy.get('[data-test-subj="watchlist-flyout-header"]').contains('Edit watchlist');
      cy.get('input[name="WatchlistDescription"]').should(
        'have.value',
        existingWatchlist.description
      );
      cy.get('input[name="WatchlistName"]').should('have.value', existingWatchlist.name);
      cy.get('input[name="WatchlistName"]').clear();
      cy.get('input[name="WatchlistName"]').type(updatedName);
      cy.get('[data-test-subj="watchlist-flyout-save"]').click();
      cy.wait('@updateWatchlist');
      cy.wait('@watchlistsList');
      cy.get(WATCHLISTS_MANAGEMENT_TABLE).contains(updatedName);
    });
  }
);
