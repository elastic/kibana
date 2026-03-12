/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ENTITY_ANALYTICS_HOME_PAGE_URL } from '../../../urls/navigation';
import {
  PAGE_TITLE,
  ENTITIES_TABLE_GRID,
  ENTITIES_TABLE_EMPTY,
  DATAGRID_HEADER,
  DATAGRID_COLUMN_SELECTOR,
  DATAGRID_SORTING_SELECTOR,
  EXPAND_ROW_BUTTON,
  TIMELINE_ACTION,
  FIELDS_SELECTOR_BUTTON,
  FIELDS_SELECTOR_MODAL,
  FIELDS_SELECTOR_RESET,
  FIELDS_SELECTOR_CLOSE,
  LAST_UPDATED,
  GROUPING_SELECTOR,
  FLYOUT_RIGHT_PANEL,
} from '../../../screens/entity_analytics/entity_analytics_home';

const ARCHIVE_NAME = 'entity_store_v2_home';

const waitForTableToLoad = () => {
  cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
  cy.get(ENTITIES_TABLE_GRID, { timeout: 30000 }).should('exist');
};

describe(
  'Entities table - Data grid',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('renders the data grid with column and sorting selectors', () => {
      cy.get(DATAGRID_COLUMN_SELECTOR).should('be.visible');
      cy.get(DATAGRID_SORTING_SELECTOR).should('be.visible');
    });

    it('displays the correct entity count', () => {
      cy.contains('6 entities').should('be.visible');
    });

    it('shows all default column headers', () => {
      const expectedHeaders = [
        'Entity name',
        'Entity id',
        'Data source',
        'Resolved to',
        'Entity type',
        'Risk score',
        'Asset criticality',
        'Alerts',
        'Last seen',
      ];
      expectedHeaders.forEach((header) => {
        cy.get(DATAGRID_HEADER).should('contain', header);
      });
    });

    it('only shows entities with allowed types (user, host, service)', () => {
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'User');
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'Host');
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'Service');
    });
  }
);

describe(
  'Entities table - Custom column renderers',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('displays entity type values in title case', () => {
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'User');
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'Host');
      cy.get(ENTITIES_TABLE_GRID).should('contain', 'Service');
    });

    it('renders risk score values as badges with 2 decimal places', () => {
      cy.get(ENTITIES_TABLE_GRID).should('contain', '72.45');
      cy.get(ENTITIES_TABLE_GRID).should('contain', '88.22');
      cy.get(ENTITIES_TABLE_GRID).should('contain', '15.30');

      cy.get(ENTITIES_TABLE_GRID).find('.euiBadge').should('have.length.at.least', 3);
    });

    it('renders asset criticality values as badges', () => {
      cy.get(ENTITIES_TABLE_GRID).find('.euiBadge').should('have.length.at.least', 1);
    });

    it('shows em-dash for null/missing values instead of "(null)"', () => {
      cy.get(ENTITIES_TABLE_GRID).should('not.contain', '(null)');
    });
  }
);

describe(
  'Entities table - Row actions',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('expand button opens the entity flyout', () => {
      cy.get(EXPAND_ROW_BUTTON).first().click();
      cy.get(FLYOUT_RIGHT_PANEL, { timeout: 10000 }).should('be.visible');
    });

    it('"Investigate in timeline" action button exists and is clickable', () => {
      cy.get(TIMELINE_ACTION).should('have.length.at.least', 1);
      cy.get(TIMELINE_ACTION).first().should('be.visible');
      cy.get(TIMELINE_ACTION).first().click();
    });
  }
);

describe(
  'Entities table - Toolbar controls',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('"Fields" button opens the fields selector modal', () => {
      cy.get(FIELDS_SELECTOR_BUTTON).should('be.visible');
      cy.get(FIELDS_SELECTOR_BUTTON).click();
      cy.get(FIELDS_SELECTOR_MODAL, { timeout: 5000 }).should('be.visible');
    });

    it('fields selector modal can be closed', () => {
      cy.get(FIELDS_SELECTOR_BUTTON).click();
      cy.get(FIELDS_SELECTOR_MODAL, { timeout: 5000 }).should('be.visible');
      cy.get(FIELDS_SELECTOR_CLOSE).click();
      cy.get(FIELDS_SELECTOR_MODAL).should('not.exist');
    });

    it('fields selector modal has a "Reset" button', () => {
      cy.get(FIELDS_SELECTOR_BUTTON).click();
      cy.get(FIELDS_SELECTOR_MODAL, { timeout: 5000 }).should('be.visible');
      cy.get(FIELDS_SELECTOR_RESET).should('be.visible');
    });

    it('"Updated X seconds ago" text is displayed', () => {
      cy.get(LAST_UPDATED, { timeout: 10000 }).should('be.visible');
      cy.get(LAST_UPDATED).should('contain', 'Updated');
    });
  }
);

describe(
  'Entities table - Grouping',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('"Group entities by" selector is visible', () => {
      cy.get(GROUPING_SELECTOR, { timeout: 10000 }).should('exist');
    });

    it('can group by Entity type', () => {
      cy.get(GROUPING_SELECTOR).click();
      cy.contains('Entity type').click();

      cy.contains('3 groups', { timeout: 10000 }).should('be.visible');
    });

    it('grouped view shows group counters with entity counts', () => {
      cy.get(GROUPING_SELECTOR).click();
      cy.contains('Entity type').click();

      cy.contains('3 groups', { timeout: 10000 }).should('be.visible');
      cy.get('[data-test-subj="entity-analytics-grouping-counter"]').should(
        'have.length.at.least',
        1
      );
    });

    it('clicking "None" returns to the flat table view', () => {
      cy.get(GROUPING_SELECTOR).click();
      cy.contains('Entity type').click();
      cy.contains('3 groups', { timeout: 10000 }).should('be.visible');

      cy.get(GROUPING_SELECTOR).click();
      cy.contains('None').click();

      cy.contains('6 entities', { timeout: 10000 }).should('be.visible');
      cy.get(ENTITIES_TABLE_GRID).should('exist');
    });
  }
);

describe(
  'Entities table - Empty state',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      cy.get(PAGE_TITLE, { timeout: 60000 }).should('exist');
    });

    it('displays empty state when no entity data exists', () => {
      cy.get(ENTITIES_TABLE_EMPTY, { timeout: 30000 }).should('exist');
    });
  }
);
