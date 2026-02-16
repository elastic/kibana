/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from '../../../tasks/navigation';
import { login } from '../../../tasks/login';
import { ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL } from '../../../urls/navigation';
import { WATCHLISTS_MANAGEMENT_PAGE_TITLE } from '../../../screens/entity_analytics/watchlists_management';

describe(
  'Entity Analytics Watchlists Management Page ',
  {
    tags: ['@ess', '@serverless'],
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
    before(() => {});

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
      cy.url({ timeout: 10000 }).should('include', ENTITY_ANALYTICS_WATCHLISTS_MANAGEMENT_URL);
    });

    afterEach(() => {});

    after(() => {});

    it('renders page as expected', () => {
      cy.get(WATCHLISTS_MANAGEMENT_PAGE_TITLE, { timeout: 60000 }).should('exist');
    });
  }
);
