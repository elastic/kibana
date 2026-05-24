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
  DATA_GRID_ROW_CELL,
  ENTITIES_TABLE_GRID,
  PAGE_TITLE,
} from '../../../screens/entity_analytics/entity_analytics_home';
import {
  ADD_ENTITIES_ACCORDION,
  ADD_ENTITIES_SEARCH,
  ADD_ENTITIES_SECTION,
  ADD_ENTITIES_SHOWING,
  ADD_ENTITIES_TABLE,
  CONFIRM_RESOLUTION_MODAL,
  CONFIRM_MODAL_RADIO_CURRENT_AS_TARGET,
  EUI_BASIC_TABLE_ROW,
  REMOVE_ENTITY_BUTTON_ARIA,
  RESOLUTION_EMPTY_STATE,
  RESOLUTION_GROUP_TAB_CONTENT,
  RESOLUTION_GROUP_TABLE,
  RESOLUTION_PRIMARY_ENTITY_ICON,
  RESOLUTION_SECTION,
  TOASTER_HEADER,
} from '../../../screens/entity_analytics/entity_flyout_resolution';
import {
  changeAddEntitiesPageSize,
  clickAddOnSearchRow,
  clickRemoveOnGroupRow,
  confirmInResolutionModal,
  expandAddEntitiesAccordion,
  interceptResolutionGroup,
  interceptResolutionMutations,
  openEntityFlyoutFromHomeByName,
  openResolutionTabFromRightPanel,
  searchForEntity,
} from '../../../tasks/entity_analytics/entity_flyout_resolution';

const ARCHIVE_NAME = 'entity_resolution_flyout';
const SEARCH_QUERY = 'Mara Alpha';
const HOST_SEARCH_QUERY = 'Mara Beta';

const waitForTableToLoad = () => {
  cy.get(PAGE_TITLE).should('exist');
  cy.get(ENTITIES_TABLE_GRID).should('exist');
  cy.get(DATA_GRID_ROW_CELL).should('have.length.at.least', 1);
};

// The ResolutionGroupTable is rendered in both the right-panel ResolutionSection
// (read-only) and the left-panel ResolutionGroupTab — same `data-test-subj` in
// two places. Tests assert against the left-tab instance where users interact;
// scoping to RESOLUTION_GROUP_TAB_CONTENT disambiguates.
const groupTable = () => cy.get(RESOLUTION_GROUP_TAB_CONTENT).find(RESOLUTION_GROUP_TABLE);

describe(
  'Entity flyout — Manual Entity Resolution',
  {
    // Re-add `@serverless` once https://github.com/elastic/kibana/issues/266752
    // (bulk `refresh: true` requires unauthorized `indices:admin/refresh/unpromotable`
    // for the `platform_engineer` role) is resolved.
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

    beforeEach(() => {
      interceptEntityStoreStatus('running');
      interceptResolutionGroup();
      interceptResolutionMutations();
      login();
      // Flat data-grid mode so we can click the row-expand button to open the entity flyout.
      setGrouping(['none']);
      visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
      cy.wait('@entityStoreStatus', { timeout: 20000 });
      waitForTableToLoad();
    });

    describe('User flyout — solo entity (read-only)', () => {
      it('renders ResolutionSection on the right panel and opens the empty-state Resolution group tab on the left', () => {
        openEntityFlyoutFromHomeByName('Charlie Brown');
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(RESOLUTION_SECTION).should('be.visible');

        openResolutionTabFromRightPanel();

        // The empty-state component is rendered in both the right-panel
        // ResolutionSection and the left-panel ResolutionGroupTabContent — same
        // data-test-subj appears twice. Scope the assertion to the left tab.
        cy.get(RESOLUTION_GROUP_TAB_CONTENT)
          .find(RESOLUTION_EMPTY_STATE)
          .should('be.visible')
          .within(() => {
            cy.contains('Entity name').should('exist');
            cy.contains('Entity ID').should('exist');
            cy.contains('Data source').should('exist');
            cy.contains('Risk score').should('exist');
            cy.contains('No resolved entities').should('exist');
          });
      });

      it('"Add entities" accordion is collapsed by default and reveals the search field when expanded', () => {
        openEntityFlyoutFromHomeByName('Charlie Brown');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();

        // Collapsed state: the inner section content is rendered but not visible.
        cy.get(ADD_ENTITIES_ACCORDION).should('exist');
        cy.get(ADD_ENTITIES_SECTION).should('not.be.visible');

        expandAddEntitiesAccordion();
        cy.get(ADD_ENTITIES_SECTION).should('be.visible');
        cy.get(ADD_ENTITIES_SEARCH).should('be.visible');
      });

      it('search debounces, populates the table with Last seen + risk-score cells, exposes the showing counter, and supports 10 / 25 / 50 page sizes', () => {
        openEntityFlyoutFromHomeByName('Charlie Brown');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();
        expandAddEntitiesAccordion();

        searchForEntity(SEARCH_QUERY);
        cy.wait('@entitiesList', { timeout: 20000 });

        // Default page size is 10 — assert exactly 10 visible body rows.
        cy.get(ADD_ENTITIES_TABLE).find(EUI_BASIC_TABLE_ROW).should('have.length', 10);

        // Counter "Showing 1-10 of 50 entities" — bold range + total via FormattedMessage.
        cy.get(ADD_ENTITIES_SHOWING).should('contain.text', '1-10');
        cy.get(ADD_ENTITIES_SHOWING).should('contain.text', '50');

        // Last seen renders via FormattedRelativePreferenceDate: relative phrasing
        // ("X minutes ago" / "in X minutes") only if `date + 1h > now`, otherwise an
        // absolute date that includes the 4-digit year. Match either form so the
        // assertion is stable across fixture-vs-test-clock timing.
        cy.get(ADD_ENTITIES_TABLE)
          .find(EUI_BASIC_TABLE_ROW)
          .contains(/ago|in |20\d{2}/i)
          .should('exist');

        // Risk-score cell — at least one EuiBadge in the search results.
        cy.get(ADD_ENTITIES_TABLE).find('.euiBadge').should('have.length.at.least', 1);

        // Switch page size to 25.
        changeAddEntitiesPageSize(25);
        cy.wait('@entitiesList', { timeout: 20000 });
        cy.get(ADD_ENTITIES_TABLE).find(EUI_BASIC_TABLE_ROW).should('have.length', 25);

        // Switch page size to 50 (single page covering all candidates).
        changeAddEntitiesPageSize(50);
        cy.wait('@entitiesList', { timeout: 20000 });
        cy.get(ADD_ENTITIES_TABLE).find(EUI_BASIC_TABLE_ROW).should('have.length', 50);
      });
    });

    describe('User flyout — link / unlink', () => {
      it('first link from a solo entity opens the confirm modal, defaults primary to the current entity, and creates the resolution group on confirm', () => {
        openEntityFlyoutFromHomeByName('Eric Cartman');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();
        expandAddEntitiesAccordion();

        searchForEntity(SEARCH_QUERY);
        cy.wait('@entitiesList', { timeout: 20000 });

        clickAddOnSearchRow('Mara Alpha 001');

        cy.get(CONFIRM_RESOLUTION_MODAL).should('be.visible');
        // Default radio: current entity becomes the primary.
        cy.get(CONFIRM_MODAL_RADIO_CURRENT_AS_TARGET).should('be.checked');

        confirmInResolutionModal('current_as_target');
        cy.wait('@resolutionLink', { timeout: 20000 });
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(TOASTER_HEADER).should('be.visible').and('contain.text', 'Resolution group');
        cy.get(CONFIRM_RESOLUTION_MODAL).should('not.exist');

        groupTable().should('be.visible');
        groupTable().should('contain.text', 'Eric Cartman');
        groupTable().should('contain.text', 'Mara Alpha 001');
      });

      it('adds a second alias to an existing group without showing the modal, and exercises the swap-primary flow on a fresh solo entity', () => {
        // Part A — pre-existing group of 3 (Alice + 2 aliases): direct link, no modal.
        openEntityFlyoutFromHomeByName('Alice Johnson');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();

        groupTable().should('be.visible');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length', 3);

        expandAddEntitiesAccordion();
        searchForEntity(SEARCH_QUERY);
        cy.wait('@entitiesList', { timeout: 20000 });

        clickAddOnSearchRow('Mara Alpha 002');
        // No modal in the second-add path.
        cy.get(CONFIRM_RESOLUTION_MODAL).should('not.exist');

        cy.wait('@resolutionLink', { timeout: 20000 });
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(TOASTER_HEADER).should('be.visible');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length', 4);
        groupTable().should('contain.text', 'Mara Alpha 002');

        // Part B — solo entity, swap-primary path: pick the "new becomes the primary" radio.
        // Re-navigate to the home page to open a different entity.
        visit(ENTITY_ANALYTICS_HOME_PAGE_URL);
        cy.wait('@entityStoreStatus', { timeout: 20000 });
        waitForTableToLoad();

        openEntityFlyoutFromHomeByName('Frank Castle');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();
        expandAddEntitiesAccordion();
        searchForEntity(SEARCH_QUERY);
        cy.wait('@entitiesList', { timeout: 20000 });

        clickAddOnSearchRow('Mara Alpha 003');
        cy.get(CONFIRM_RESOLUTION_MODAL).should('be.visible');

        confirmInResolutionModal('new_as_target');
        cy.wait('@resolutionLink', { timeout: 20000 });
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(TOASTER_HEADER).should('be.visible');
        groupTable().should('be.visible');
        // After swap, Mara Alpha 003 is the primary (its row carries the
        // primary-entity icon), and Frank Castle becomes an alias under it.
        groupTable()
          .contains(EUI_BASIC_TABLE_ROW, 'Mara Alpha 003')
          .find(RESOLUTION_PRIMARY_ENTITY_ICON)
          .should('exist');
        groupTable().should('contain.text', 'Frank Castle');
      });

      it('removes an alias from an existing group, and disables the remove button on the primary entity', () => {
        openEntityFlyoutFromHomeByName('Greg House');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();

        groupTable().should('be.visible');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length', 3);

        // Primary's remove button is disabled (tooltip "Cannot remove primary entity").
        groupTable()
          .find(EUI_BASIC_TABLE_ROW)
          .contains(EUI_BASIC_TABLE_ROW, 'Greg House')
          .find(`button[aria-label="${REMOVE_ENTITY_BUTTON_ARIA}"]`)
          .should('be.disabled');

        clickRemoveOnGroupRow('greg@okta.com');
        cy.wait('@resolutionUnlink', { timeout: 20000 });
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(TOASTER_HEADER).should('be.visible');
        groupTable().should('not.contain.text', 'greg@okta.com');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length', 2);
      });
    });

    describe('User flyout — group risk-score badge in the left tab header', () => {
      it('shows a numeric RiskScoreCell badge when the group has a calculated resolution risk score', () => {
        openEntityFlyoutFromHomeByName('Alice Johnson');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();

        cy.get(RESOLUTION_GROUP_TAB_CONTENT).within(() => {
          cy.contains('Group risk score').should('be.visible');
          // The fixture seeds 82.50 for Alice's resolution risk score; formatted to 2 decimals.
          cy.get('.euiBadge').contains('82.50').should('be.visible');
        });
      });

      it('shows the N/A fallback badge when the group lacks a calculated resolution risk score', () => {
        openEntityFlyoutFromHomeByName('Diana Prince');
        cy.wait('@resolutionGroup', { timeout: 20000 });
        openResolutionTabFromRightPanel();

        cy.get(RESOLUTION_GROUP_TAB_CONTENT).within(() => {
          cy.contains('Group risk score').should('be.visible');
          cy.get('.euiBadge').contains('N/A').should('be.visible');
        });
      });
    });

    describe('Host flyout — smoke', () => {
      it('renders ResolutionSection, lists the existing host alias, and links a new host end-to-end', () => {
        openEntityFlyoutFromHomeByName('web-server-prod-1');
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(RESOLUTION_SECTION).should('be.visible');

        openResolutionTabFromRightPanel();

        groupTable().should('be.visible');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length.at.least', 2);
        groupTable().should('contain.text', 'web-server-prod-1.cmdb');

        expandAddEntitiesAccordion();
        searchForEntity(HOST_SEARCH_QUERY);
        cy.wait('@entitiesList', { timeout: 20000 });

        clickAddOnSearchRow('Mara Beta Host 001');
        // Group already exists — no modal on the second-add path.
        cy.get(CONFIRM_RESOLUTION_MODAL).should('not.exist');

        cy.wait('@resolutionLink', { timeout: 20000 });
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(TOASTER_HEADER).should('be.visible');
        groupTable().should('contain.text', 'Mara Beta Host 001');
      });
    });

    describe('Service flyout — smoke', () => {
      it('renders ResolutionSection and lists the existing service alias on the left tab', () => {
        openEntityFlyoutFromHomeByName('api-gateway-prod');
        cy.wait('@resolutionGroup', { timeout: 20000 });

        cy.get(RESOLUTION_SECTION).should('be.visible');

        openResolutionTabFromRightPanel();

        groupTable().should('be.visible');
        groupTable().find(EUI_BASIC_TABLE_ROW).should('have.length.at.least', 2);
        groupTable().should('contain.text', 'api-gateway-prod');
        groupTable().should('contain.text', 'api-gateway-prod.cmdb');
      });
    });
  }
);
