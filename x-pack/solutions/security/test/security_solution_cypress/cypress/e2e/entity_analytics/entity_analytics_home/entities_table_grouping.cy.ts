/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  setGrouping,
  waitForGroupingTable,
  interceptEntityStoreSearch,
  selectGroupingOption,
  interceptEntityStoreStatus,
} from '../../../tasks/entity_analytics/entity_analytics_home';
import { ENTITY_ANALYTICS_HOME_PAGE_URL } from '../../../urls/navigation';
import {
  PAGE_TITLE,
  ENTITIES_TABLE_GRID,
  GROUPING_LEVEL_0,
  GROUPING_ACCORDION,
  GROUPING_ACCORDION_CONTENT,
  GROUP_PANEL_TOGGLE,
  GROUP_STATS,
  GROUP_SELECTOR_DROPDOWN,
  PANEL_NONE,
  PANEL_ENTITY_TYPE,
  PANEL_RESOLUTION,
} from '../../../screens/entity_analytics/entity_analytics_home';

const ARCHIVE_NAME = 'entity_store_v2_home';

describe(
  'Entities table grouping',
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

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    describe('Group by Resolution', () => {
      beforeEach(() => {
        login();
        interceptEntityStoreStatus('running');
        interceptEntityStoreSearch();
        visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
        cy.get(PAGE_TITLE).should('exist');
        // Resolution is the default grouping
        cy.wait('@entityStoreStatus', { timeout: 20000 });
        cy.wait('@entityStoreSearch');
        waitForGroupingTable();
      });

      it('displays resolution groups', () => {
        cy.get(GROUPING_ACCORDION).should('have.length.at.least', 1);
      });

      it('resolution group shows target entity name', () => {
        cy.get(GROUPING_LEVEL_0).should('contain', 'Alice Johnson');
      });

      it('resolution group shows entity count including aliases', () => {
        // Alice's group has 3 entities (target + 2 aliases)
        cy.contains(GROUP_PANEL_TOGGLE, 'Alice Johnson')
          .closest(GROUPING_ACCORDION)
          .find(GROUP_STATS)
          .should('contain', '3');
      });

      it('resolution group shows risk score badge', () => {
        // Alice's group has resolution risk score 82.50
        cy.contains(GROUP_PANEL_TOGGLE, 'Alice Johnson')
          .closest(GROUPING_ACCORDION)
          .find(GROUP_STATS)
          .should('contain', '82.50');
      });

      it('expanding a resolution group shows target and aliases in data grid', () => {
        cy.contains(GROUP_PANEL_TOGGLE, 'Alice Johnson').click();
        cy.contains(GROUP_PANEL_TOGGLE, 'Alice Johnson')
          .closest(GROUPING_ACCORDION)
          .find(GROUPING_ACCORDION_CONTENT)
          .should('contain', 'Alice Johnson')
          .and('contain', 'alice@okta.com')
          .and('contain', 'alice.j@entra.com');
      });

      it('standalone entities appear as individual groups', () => {
        cy.get(GROUPING_LEVEL_0).should('contain', 'Bob Smith');
        cy.get(GROUPING_LEVEL_0).should('contain', 'web-server-prod-1');
      });
    });

    describe('Group by Entity type', () => {
      beforeEach(() => {
        login();
        setGrouping(['entity.EngineMetadata.Type']);
        interceptEntityStoreStatus('running');
        interceptEntityStoreSearch();
        visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
        cy.get(PAGE_TITLE).should('exist');
        cy.wait('@entityStoreStatus', { timeout: 20000 });
        cy.wait('@entityStoreSearch');
        waitForGroupingTable();
      });

      it('shows group selector with Entity type selected', () => {
        cy.get(`${GROUP_SELECTOR_DROPDOWN}:visible`).should('contain', 'Entity type');
      });

      it('displays User, Host, Service groups', () => {
        cy.get(GROUPING_LEVEL_0).should('contain', 'User');
        cy.get(GROUPING_LEVEL_0).should('contain', 'Host');
        cy.get(GROUPING_LEVEL_0).should('contain', 'Service');
      });

      it('each group shows entity count badge', () => {
        cy.get(GROUP_STATS).should('have.length.at.least', 3);
      });

      it('expanding User group shows user entities in data grid', () => {
        cy.contains(GROUP_PANEL_TOGGLE, 'User').click();
        cy.contains(GROUP_PANEL_TOGGLE, 'User')
          .closest(GROUPING_ACCORDION)
          .find(GROUPING_ACCORDION_CONTENT)
          .should('contain', 'Alice Johnson');
      });
    });

    describe('Switching grouping', () => {
      beforeEach(() => {
        login();
        setGrouping(['entity.relationships.resolution.resolved_to']);
        interceptEntityStoreStatus('running');
        interceptEntityStoreSearch();
        visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
        cy.get(PAGE_TITLE).should('exist');
        cy.wait('@entityStoreStatus', { timeout: 20000 });
        cy.wait('@entityStoreSearch');
        waitForGroupingTable();
      });

      it('selecting "None" shows flat data table', () => {
        selectGroupingOption(PANEL_NONE);
        cy.get(ENTITIES_TABLE_GRID).should('exist');
        // Grouped table should not exist in flat mode
        cy.get('[data-test-subj="grouping-table"]').should('not.exist');
      });

      it('can switch between Resolution and Entity type', () => {
        // Page loads with Resolution default (set in beforeEach)
        cy.get(GROUPING_LEVEL_0).should('contain', 'Alice Johnson');

        // Switch to Entity type
        selectGroupingOption(PANEL_NONE);
        selectGroupingOption(PANEL_ENTITY_TYPE);
        waitForGroupingTable();
        cy.get(GROUPING_LEVEL_0).should('contain', 'User');

        // Switch back to Resolution
        selectGroupingOption(PANEL_NONE);
        selectGroupingOption(PANEL_RESOLUTION);
        waitForGroupingTable();
        cy.get(GROUPING_LEVEL_0).should('contain', 'Alice Johnson');
      });
    });
  }
);
