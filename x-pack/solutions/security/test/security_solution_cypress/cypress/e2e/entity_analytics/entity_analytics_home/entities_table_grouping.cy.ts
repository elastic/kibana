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
  GROUPING_LEVEL_0,
  GROUPING_ACCORDION,
  GROUPING_ACCORDION_CONTENT,
  GROUP_PANEL_TOGGLE,
  GROUP_STATS,
  GROUP_SELECTOR_DROPDOWN,
  IS_LOADING_GROUPING_TABLE,
  PANEL_NONE,
  PANEL_ENTITY_TYPE,
  PANEL_RESOLUTION,
} from '../../../screens/entity_analytics/entity_analytics_home';

const ARCHIVE_NAME = 'entity_store_v2_home';

const waitForGroupingTable = () => {
  cy.get(IS_LOADING_GROUPING_TABLE).should('not.exist');
  cy.get(GROUPING_LEVEL_0).should('exist');
};

/**
 * Sets the grouping via localStorage before navigating to avoid flaky
 * dropdown interactions (search responses can close the popover mid-click).
 * @kbn/grouping stores state under `localStorage.groups` keyed by groupingId.
 */
const setGrouping = (activeGroups: string[]) => {
  cy.window().then((win) =>
    win.localStorage.setItem(
      'groups',
      JSON.stringify({ 'entityAnalytics:grouping': { activeGroups } })
    )
  );
};

const selectGroupingOption = (panelSelector: string) => {
  // Wait for ALL in-flight requests to settle (global Kibana loading indicator)
  // before opening the dropdown. A search response arriving mid-interaction
  // can re-render the component and close the popover.
  cy.get('[data-test-subj="globalLoadingIndicator-hidden"]').should('exist');
  cy.get('[data-test-subj="globalLoadingIndicator"]').should('not.exist');
  cy.get(IS_LOADING_GROUPING_TABLE).should('not.exist');

  // Click dropdown and select the option. If a search response re-renders
  // the component and closes the popover between click and option selection,
  // retry up to 3 times.
  const clickAndSelect = (attempt = 1): void => {
    cy.get(`${GROUP_SELECTOR_DROPDOWN}:visible`).click();
    cy.get('body').then(($body) => {
      if ($body.find(panelSelector).filter(':visible').length > 0) {
        cy.get(panelSelector).click();
      } else if (attempt < 3) {
        cy.log(`Grouping popover closed before selection (attempt ${attempt}), retrying`);
        // Wait for requests to settle before retrying
        cy.get('[data-test-subj="globalLoadingIndicator-hidden"]').should('exist');
        clickAndSelect(attempt + 1);
      } else {
        // Final attempt — let Cypress assertion fail with a clear error
        cy.get(panelSelector).should('be.visible').click();
      }
    });
  };
  clickAndSelect();
};

describe(
  'Entities table - Group by Resolution',
  {
    tags: ['@ess'],
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
      cy.get(PAGE_TITLE).should('exist');
      // Resolution is the default grouping
      waitForGroupingTable();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
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
        .within(() => {
          cy.contains('Alice Johnson').should('exist');
          cy.contains('alice@okta.com').should('exist');
          cy.contains('alice.j@entra.com').should('exist');
        });
    });

    it('standalone entities appear as individual groups', () => {
      cy.get(GROUPING_LEVEL_0).should('contain', 'Bob Smith');
      cy.get(GROUPING_LEVEL_0).should('contain', 'web-server-prod-1');
    });
  }
);

describe(
  'Entities table - Group by Entity type',
  {
    tags: ['@ess'],
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
      setGrouping(['entity.EngineMetadata.Type']);
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      cy.get(PAGE_TITLE).should('exist');
      waitForGroupingTable();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
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
  }
);

describe(
  'Entities table - Switching grouping',
  {
    tags: ['@ess'],
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
      cy.get(PAGE_TITLE).should('exist');
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: ARCHIVE_NAME });
    });

    it('selecting "None" shows flat data table', () => {
      waitForGroupingTable();
      selectGroupingOption(PANEL_NONE);
      cy.get(ENTITIES_TABLE_GRID).should('exist');
      // Grouped table should not exist in flat mode
      cy.get('[data-test-subj="grouping-table"]').should('not.exist');
    });

    it('can switch between Resolution and Entity type', () => {
      // Page loads with Resolution default
      waitForGroupingTable();
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
  }
);
