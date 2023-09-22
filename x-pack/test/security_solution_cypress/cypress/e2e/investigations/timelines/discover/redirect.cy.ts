/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_CONTAINER } from '../../../../screens/discover';
import { PAGE_TITLE } from '../../../../screens/common/page';
import { waitForDiscoverGridToLoad } from '../../../../tasks/discover';
import { updateDateRangeInLocalDatePickers } from '../../../../tasks/date_picker';
import { login, visit } from '../../../../tasks/login';
import { ALERTS_URL, DISCOVER_URL, DASHBOARDS_URL } from '../../../../urls/navigation';

const INITIAL_START_DATE = 'Jan 18, 2021 @ 20:33:29.186';
const INITIAL_END_DATE = 'Jan 19, 2024 @ 20:33:29.186';

describe(
  `Discover redirect to timeline in serverless mode`,
  {
    env: { ftrConfig: { enableExperimental: ['discoverInTimeline'] } },
    tags: ['@serverless'],
  },
  () => {
    beforeEach(() => {
      login();
      visit(DISCOVER_URL);
      updateDateRangeInLocalDatePickers(DISCOVER_CONTAINER, INITIAL_START_DATE, INITIAL_END_DATE);
      waitForDiscoverGridToLoad();
    });
    it('should load the discover components in timeline via a redirect', () => {
      cy.get(DISCOVER_CONTAINER).should('exist');
      cy.url().should('include', ALERTS_URL);
    });
    it('should support the native back button by redirecting via replace and not push', () => {
      visit(DASHBOARDS_URL);
      cy.get(PAGE_TITLE).should('contain.text', 'Dashboards');
      visit(DISCOVER_URL);
      cy.get(DISCOVER_CONTAINER).should('exist');
      cy.go('back');
      cy.get(PAGE_TITLE).should('contain.text', 'Dashboards');
    });
  }
);
