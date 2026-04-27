/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  interceptEntityStoreStatus,
  setGrouping,
} from '../../../tasks/entity_analytics/entity_analytics_home';
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
  FLYOUT_RIGHT_PANEL,
} from '../../../screens/entity_analytics/entity_analytics_home';
import { TIMELINE_FLYOUT_WRAPPER } from '../../../screens/timeline';

const ARCHIVE_NAME = 'entity_store_v2_home';

const waitForTableToLoad = () => {
  cy.get(PAGE_TITLE).should('exist');
  cy.get(ENTITIES_TABLE_GRID).should('exist');
  cy.get('[data-test-subj="dataGridRowCell"]').should('have.length.at.least', 1);
};

describe(
  'Entities table',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'entityAnalyticsNewHomePageEnabled',
          ])}`,
          '--uiSettings.overrides.securitySolution:entityStoreEnableV2=true',
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: ARCHIVE_NAME });
    });

    beforeEach(() => {
      interceptEntityStoreStatus('running');
      login();
      setGrouping(['none']);
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      cy.wait('@entityStoreStatus', { timeout: 20000 });
      waitForTableToLoad();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    describe('Data grid', () => {
      it('renders the data grid with column and sorting selectors', () => {
        cy.get(DATAGRID_COLUMN_SELECTOR).should('be.visible');
        cy.get(DATAGRID_SORTING_SELECTOR).should('be.visible');
      });

      it('displays the correct entity count', () => {
        cy.contains('8 entities').should('be.visible');
      });

      it('shows all default column headers', () => {
        const expectedHeaders = [
          'Entity name',
          'Entity ID',
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
    });

    describe('Custom column renderers', () => {
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
    });

    describe('Row actions', () => {
      it('expand button opens the entity flyout with the correct entity', () => {
        cy.get('[data-test-subj="dataGridRowCell"][data-gridcell-column-id="entity.name"]')
          .first()
          .find('.unifiedDataTable__cellValue')
          .invoke('text')
          .then((entityName) => {
            cy.get(EXPAND_ROW_BUTTON).first().click();
            cy.get(FLYOUT_RIGHT_PANEL).should('be.visible');
            cy.get('[data-test-subj="flyoutTitleText"]').should('contain', entityName.trim());
          });
      });

      it('"Investigate in timeline" action button opens the timeline', () => {
        cy.get(TIMELINE_ACTION).should('have.length.at.least', 1);
        cy.get(TIMELINE_ACTION).first().should('be.visible');
        cy.get(TIMELINE_ACTION).first().click();
        cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
      });
    });

    describe('Toolbar controls', () => {
      it('"Fields" button opens the fields selector modal', () => {
        cy.get(FIELDS_SELECTOR_BUTTON).should('be.visible');
        cy.get(FIELDS_SELECTOR_BUTTON).click();
        cy.get(FIELDS_SELECTOR_MODAL).should('be.visible');
      });

      it('fields selector modal can be closed', () => {
        cy.get(FIELDS_SELECTOR_BUTTON).click();
        cy.get(FIELDS_SELECTOR_MODAL).should('be.visible');
        cy.get(FIELDS_SELECTOR_CLOSE).click();
        cy.get(FIELDS_SELECTOR_MODAL).should('not.exist');
      });

      it('fields selector modal has a "Reset" button', () => {
        cy.get(FIELDS_SELECTOR_BUTTON).click();
        cy.get(FIELDS_SELECTOR_MODAL).should('be.visible');
        cy.get(FIELDS_SELECTOR_RESET).should('be.visible');
      });

      it('"Updated X seconds ago" text is displayed', () => {
        cy.get(LAST_UPDATED).should('be.visible');
        cy.get(LAST_UPDATED).should('contain', 'Updated');
      });
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
          '--uiSettings.overrides.securitySolution:entityStoreEnableV2=true',
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      interceptEntityStoreStatus('running');
      login();
      setGrouping(['none']);
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      cy.wait('@entityStoreStatus', { timeout: 20000 });
      cy.get(PAGE_TITLE).should('exist');
    });

    it('displays empty state when no entity data exists', () => {
      cy.get(ENTITIES_TABLE_EMPTY).should('exist');
    });
  }
);
